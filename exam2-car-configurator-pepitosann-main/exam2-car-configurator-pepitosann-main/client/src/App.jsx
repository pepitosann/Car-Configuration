import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Model } from './Model';
import { ModelList } from './ModelList';
import { Accessory } from './Accessory';
import { AccessoryList } from './AccessoryList';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { ErrorsAlert, MyNavbar, modelsContext, accessoriesContext, usersContext, ccActivitiesContext, waitingContext, checkCarConfigurationModified, NotFoundPage } from './Miscellaneous';
import { Col, Container, Row, Spinner } from 'react-bootstrap';
import { API } from './API';
import { LoginForm } from './LoginForm';
import { CarConfiguration } from './CarConfiguration';

function App() {
  return (
    <BrowserRouter>
      <Main />
    </BrowserRouter>
  );
}

function Main() {
  const navigate = useNavigate();

  /** The list of models */
  const [models, setModels] = useState([]);

  /** The list of accessories */
  const [accessories, setAccessories] = useState([]);

  /** A list of errors */
  const [errors, setErrors] = useState([]);

  /**
   * Information about the currently logged in user.
   * This is undefined when no user is logged in
   */
  const [user, setUser] = useState(undefined);

  /**
  * The car configuration before any local changes.
  */
  const [savedCarConfiguration, setSavedCarConfiguration] = useState(undefined);

  const [authToken, setAuthToken] = useState(undefined);

  /** Flags initial loading of the app */
  const [loading, setLoading] = useState(true);

  /** Network-related waiting, like after pressing save or delete car configuration. When waiting all controls are disabled. */
  const [waiting, setWaiting] = useState(false);

  /** State to define which is the selected model, used to disable the other model buttons */
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    // Load the list of models, the accessories and number of available pieces from the server
    Promise.all([API.fetchModels(), API.fetchAccessories(), API.fetchAvailableAccessories()])
      .then(res => {
        const m = res[0]; // Models
        const a = res[1]; // Accessories
        const n = res[2]; // Available accessories

        setModels(
          m.map(model => new Model(
            model.id,
            model.name,
            model.power,
            model.price,
            model.maxNumber
          ))
        );

        setAccessories(
          a.map(accessory => new Accessory(
            accessory.id,
            accessory.name,
            accessory.description,
            accessory.price,
            accessory.availability = n[accessory.id] || 0,
            accessory.mandatory,
            accessory.incompat
          ))
        );

        // Loading done
        setLoading(false);

      })
      .catch(err => setErrors(err));

    // Check if the user was already logged in
    if (user) {
      API.fetchCurrentUser()
        .then(user => {
          setUser(user);
          setSavedCarConfiguration({ quality: user.quality, owner: user.owner, model: user.cc.model, accessories: user.cc.accessories });
          API.getAuthToken().then((res) => setAuthToken(res.token));
        })
        .catch(err => {
          setErrors(err.filter(e => e !== "Not authenticated"));
        });
    }
  }, []);

  const CCDepStr = savedCarConfiguration && savedCarConfiguration.model && savedCarConfiguration.accessories;

  useEffect(() => {
    if (user) {
      API.getAuthToken()
        .then((res) => {
          setAuthToken(res.token);
          if (savedCarConfiguration) {
            if (savedCarConfiguration.model && savedCarConfiguration.accessories) {
              if (savedCarConfiguration.model.length > 0) {
                API.getManufacturingTime(res.token, savedCarConfiguration)
                  .then(val => setUser(user => ({ ...user, manufacturingTime: val.manufacturingTime })));
              }
            }
          }
        })
        .catch(() => { });
    }
  }, [CCDepStr]);

  /**
   * Refetches dynamic content (availability of accessory and car condiguration info)
   * 
   * @returns a Promise that resolves when the refetch is complete
   */
  const refetchDynamicContent = () => {

    // Fetch availability of accessory
    const p1 = API.fetchAvailableAccessories()
      .then(n => setAccessories(accessories => accessories.map(c => ({ ...c, availability: n[c.id] || 0 }))))
      .catch(err => setErrors(err));

    // Fetch user's info
    const p2 = API.fetchCurrentUser()
      .then(user => {
        setUser(user);
        setSavedCarConfiguration({ quality: user.quality, owner: user.owner, model: user.cc.model, accessories: user.cc.accessories });
      })
      .catch(err => {
        setErrors(err.filter(e => e !== "Not authenticated"));
      });

    return Promise.all([p1, p2]);
  }

  /**
   * Perform the login
   * 
   * @param username username of the user
   * @param password password of the user
   * @param onFinish optional callback to be called on login success or fail
   */
  const login = (username, password, onFinish) => {
    API.login(username, password)
      .then(user => {
        setErrors([]);
        refetchDynamicContent()
          .then(() => navigate("/"));
      })
      .catch(err => setErrors(err))
      .finally(() => onFinish?.());
  };

  /**
  * Perform the logout
  */
  const logout = () => {
    API.logout()
      .then(() => {
        setSelectedModel(null);
        setUser(undefined);
        setSavedCarConfiguration(undefined);
        setAuthToken(undefined);
      })
      .catch(err => {
        setErrors(err.filter(e => e !== "Not authenticated"));
      });
  };

  /**
   * Create a car configuration
   * 
   * @param owner 
   */
  const createCarConfiguration = owner => {
    setUser(user => ({ ...user, owner, cc: { model: [], accessories: [] }, ccEdited: false }));
  };

  /**
   * Delete the current car configuration locally and remotely
   */
  const deleteCarConfiguration = () => {
    setWaiting(true);

    // Only submit the deletion to the server if there was a saved car configurarion in the first place
    const p = (savedCarConfiguration.owner !== null && savedCarConfiguration.owner !== undefined) ?
      API.deleteCarConfiguration()
      :
      Promise.resolve();

    return p.then(() => refetchDynamicContent())
      .catch(err => setErrors(err))
      .finally(() => setWaiting(false));
  };

  /**
  * Add the model to the car configuration. Note that this does no check for the validity of this operation.
  * In this case it's ok because the application forbids the user from reaching this function call
  * if doing so violates any constraint.
  * 
  * @param modelId code of the model to add
  */
  const addModelToCC = modelId => {
    setUser(user => {
      const ccLocal = [...user.cc.model, { model_id: modelId }];
      return { ...user, cc: { ...user.cc, model: ccLocal }, ccEdited: true };
    });
  };

  /**
   * Add an accessories to the car configuration. Note that this does no check for the validity of this operation.
   * In this case it's ok because the application forbids the user from reaching this function call
   * if doing so violates any constraint.
   * 
   * @param accessoryId id of the accessory to add
   */
  const addAccessoryToCC = (accessoryId, accessoryName) => {
    setUser(user => {
      const ccLocal = [...user.cc.accessories, { accessory_id: accessoryId, accessory_name: accessoryName }];
      const ccEdited = checkCarConfigurationModified(savedCarConfiguration, { owner: user.owner, accessories: ccLocal });
      return { ...user, cc: { ...user.cc, accessories: ccLocal }, ccEdited };
    });
  };

  /**
   * Remove an accessory from the car configuration. Similar considerations to addAccessoryToCC apply
   * 
   * @param accessoryId id of the accessory to remove
   */
  const removeAccessoryFromCC = accessoryId => {
    setUser(user => {
      const ccLocal = user.cc.accessories.filter(cc => cc.accessory_id !== accessoryId);
      const ccEdited = checkCarConfigurationModified(savedCarConfiguration, { owner: user.owner, accessories: ccLocal });
      return { ...user, cc: { ...user.cc, accessories: ccLocal }, ccEdited };
    });
  };

  /**
   * Save changes made to the car configuration.
   */
  const saveCCChanges = () => {
    setWaiting(true);
    const create = () => API.createCarConfiguration(user.cc);
    const edit = () => {

      // Finding accessories to add
      const add = user.cc.accessories.filter(userAcc => !savedCarConfiguration.accessories.some(savedAcc => savedAcc.accessory_id === userAcc.accessory_id));

      // Finding accessories to remove
      const rem = savedCarConfiguration.accessories.filter(savedAcc => !user.cc.accessories.some(userAcc => userAcc.accessory_id === savedAcc.accessory_id));

      return API.editCarConfiguration(add, rem);
    };

    // Differentiate between creation of a new car configuration and edit of an existing one
    const APICall = (savedCarConfiguration.owner === null || savedCarConfiguration.owner === undefined) ?
      create : edit;

    return APICall()
      .then(() => refetchDynamicContent())
      .catch(err => setErrors(err))
      .finally(() => setWaiting(false));
  };


  /**
   * Discard the latest changes made to the current configuration, reset to the server's version
   */
  const discardCCChanges = () => {
    if (user.cc.model)
      setSelectedModel(null);
    // Rollback to the saved version of the car configuration
    setUser(user => ({ ...user, owner: savedCarConfiguration.owner, cc: { model: savedCarConfiguration.model, accessories: savedCarConfiguration.accessories }, ccEdited: false }));
  };

  // Groups all the cc-related functions
  const ccActivities = {
    createCarConfiguration,
    deleteCarConfiguration,
    addModelToCC,
    addAccessoryToCC,
    removeAccessoryFromCC,
    saveCCChanges,
    discardCCChanges
  };

  return (
    <Routes>
      <Route path="/" element={<Header user={user} logoutCbk={logout} errors={errors} clearErrors={() => setErrors([])} />}>
        <Route path="" element={loading ? <LoadingSpinner /> : <HomePage user={user} models={models} accessories={accessories} ccActivities={ccActivities} errorAlertActive={errors.length > 0} waiting={waiting} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />} />
        <Route path="login" element={loading ? <LoadingSpinner /> : <LoginForm loginCbk={login} errorAlertActive={errors.length > 0} />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/**
 * Proper home page component of the app
 *
 * @param props.model list of all the Model objects
 * @param props.accessories list of all the Accessories objects
 * @param props.user object with all the currently logged in user's info
 * @param props.ccActivities object with all the car configuration related functions
 * @param props.errorAlertActive true when the error alert on the top is active and showing, false otherwise
 * @param props.waiting boolean, when true all controls should be disabled
 * @param selectedModel the state used to understand if and which model has been selected
 * @param setSelectedModel the function to modify the state selectedModel
 */
function HomePage(props) {
  return (
    <modelsContext.Provider value={props.models}>
      <accessoriesContext.Provider value={props.accessories}>
        <usersContext.Provider value={props.user}>
          <ccActivitiesContext.Provider value={props.ccActivities}>
            <waitingContext.Provider value={props.waiting}>
              <Container fluid style={{ paddingLeft: '2rem', paddingRight: '2rem', paddingBottom: '1rem', marginTop: props.errorAlertActive ? '2rem' : '6rem' }}>
                <Row className="justify-content-center mb-4">
                  <Col lg={8}>
                    <div style={{ textAlign: 'center', backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)', marginTop: '2rem' }}>
                      <h2 style={{ color: '#343a40' }}>Discover Our New Incredible Service!</h2>
                      <p style={{ fontSize: '1.2rem', color: '#6c757d' }}>
                        Experience the thrill of purchasing our limited edition cars, featuring some of the most iconic models from the world of movies. Personalize your vehicle with a variety of new accessories to make it truly unique.
                      </p>
                    </div>
                  </Col>
                </Row>
                <Row className="justify-content-center">
                  <Col lg style={{ maxWidth: '70%' }}>
                    <h3>Our car models available:</h3>
                    <ModelList selectedModel={props.selectedModel} setSelectedModel={props.setSelectedModel} />
                    <hr style={{ margin: '2rem 0' }} />
                    <h3>Set of possible accessories to select:</h3>
                    <AccessoryList />
                  </Col>
                  {props.user ? (
                    <Col lg>
                      <CarConfiguration selectedModel={props.selectedModel} setSelectedModel={props.setSelectedModel} />
                    </Col>
                  ) : null}
                </Row>
                <Footer />
              </Container>
            </waitingContext.Provider>
          </ccActivitiesContext.Provider>
        </usersContext.Provider>
      </accessoriesContext.Provider>
    </modelsContext.Provider>
  );
}

/**
 * Header of the page
 * 
 * @param props.errors current list of error strings
 * @param props.clearErrors callback to clear all errors
 * @param props.user object with all the currently logged in user's info
 * @param props.logoutCbk callback to perform the user's logout
 */
function Header(props) {
  return (
    <>
      <MyNavbar user={props.user} logoutCbk={props.logoutCbk} />
      {
        props.errors.length > 0 ? <ErrorsAlert errors={props.errors} clear={props.clearErrors} /> : false
      }
      <Outlet />
    </>
  );
}

/**
 * A loading spinner shown on first loading of the app
 */
function LoadingSpinner() {
  return (
    <div className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}

/**
 * Footer of the page
 */
function Footer() {
  return (
    <footer className="mt-5 py-3 bg-dark text-white">
      <Container>
        <Row>
          <Col className="text-center">
            <p>&copy; 2024 Forward to the Future. All rights reserved.</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}

export default App;