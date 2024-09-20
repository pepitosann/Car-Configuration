import { createContext } from "react";
import { Alert, Button, Container, Nav, Navbar, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";

/** Context used to propagate the list of models */
const modelsContext = createContext();

/** Context used to propagate the list of accessories */
const accessoriesContext = createContext();

/** Context used to propagate the user object */
const usersContext = createContext();

/** Context used to propagate all the car configuration related functions */
const ccActivitiesContext = createContext();

/** Context used to propagate the waiting state to everything that might need it */
const waitingContext = createContext();

/**
 * The navigation bar at the top of the app.
 * This is meant to be inserted as a parent route to the entire app
 * 
 * @param props.user object with all the currently logged in user's info
 * @param props.logoutCbk callback to perform the user's logout
 */
function MyNavbar(props) {

  const navigate = useNavigate();

  return (
    <>
      <Navbar className="shadow" fixed="top" bg="light" style={{ "marginBottom": "2rem" }}>
        <Container>
          <Navbar.Brand href="/" onClick={event => { event.preventDefault(); navigate("/"); }}>
            <i className="bi bi-speedometer2"></i>
            {" "}
            Forward to the Future
          </Navbar.Brand>
          <Nav>
            {
              props.user ?
                <Navbar.Text>
                  Logged in as: {props.user.username} | <a href="/logout" onClick={event => { event.preventDefault(); props.logoutCbk(); }}>Logout</a>
                </Navbar.Text>
                :
                <Nav.Link href="/login" active={false} onClick={event => { event.preventDefault(); navigate("/login"); }}>
                  Login
                  {" "}
                  <i className="bi bi-person-fill" />
                </Nav.Link>
            }
          </Nav>
        </Container>
      </Navbar>
    </>
  );
}

/**
 * Informs the user that the route is not valid
 */
function NotFoundPage() {

  return <>
    <div style={{ "textAlign": "center", "paddingTop": "5rem" }}>
      <h1>
        <i className="bi bi-exclamation-circle-fill" />
        {" "}
        The page cannot be found
        {" "}
        <i className="bi bi-exclamation-circle-fill" />
      </h1>
      <br />
      <p>
        The requested page does not exist, please head back to the <Link to={"/"}>app</Link>.
      </p>
    </div>
  </>;
}

/**
 * Bootstrap's Alert component used to show errors
 * 
 * @param props.errors list of error strings to show
 * @param props.clear callback to clear all errors
 */
function ErrorsAlert(props) {
  return (
    <Alert variant="danger" dismissible onClose={props.clear} style={{ "margin": "2rem", "marginTop": "6rem" }}>
      {props.errors.length === 1 ? props.errors[0] : ["Errors: ", <br key="br" />, <ul key="ul">
        {
          props.errors.map((e, i) => <li key={i + ""}>{e}</li>)
        }
      </ul>]}
    </Alert>
  );
}

/**
 * A small round button used for adding/removing elements
 * 
 * @param props.inner contents of the button
 * @param props.variant variant of the bootstrap Button
 * @param props.tooltip text to show on hover. Disabled if empty
 * @param props.disabled whether the button is disabled or not
 * @param props.onClick callback on click of the button
 */
function SmallRoundButton(props) {
  const button = <Button variant={props.variant} disabled={props.disabled} className="rounded-pill" onClick={props.onClick} style={{
    "width": "30px",
    "height": "30px",
    "textAlign": "center",
    "padding": "0px"
  }}>
    {props.inner}
  </Button>;

  if (props.tooltip) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={"tooltip2"}>{props.tooltip}</Tooltip>
        }
      >
        <div>{ button }</div>
      </OverlayTrigger>
    );
  } else {
    return button;
  }
}

/**
 * Checks whether the current car configuration contains local changes vs the saved version
 * 
 * @param saved saved version of the car configuration
 * @param current current car configuration
 * 
 * @returns true if the car configuration has been modified, false if they are equal
 */
function checkCarConfigurationModified(saved, current) {

  if (saved.owner !== current.owner) return true;

  if (saved.accessories.length !== current.accessories.length) return true;

  for (const c of saved.accessories) {
    if (!current.accessories.some(currentAccessory => currentAccessory.accessory_id === c.accessory_id))
      return true;
  }
  
  return false;
}

/**
 * Checks the compatibility of the specified accessory with the provided car configuration
 * 
 * @param accessory the accessory object to test
 * @param carConfiguration a list of all the accessories codes currently in the car Configuration
 * @param accessories all the accessories
 * 
 * @returns an object like {result: <boolean>, reason: "..."}, where reason, in case result is false,
 *          contains a user-appropriate explaination for why this accessory is not compatible
 */
function checkCarConfigurationConstraints(accessory, cc, accessories) {
  
  // Is this addition or removal?
  if (cc.accessories.some(acc => acc.accessory_id === accessory.id)) {
    // Removal
    // Check if there's any other accessory in the car configuration that needs this one
    let needy = cc.accessories
      .map(acc => accessories.find(c => c.id === acc.accessory_id))
      .filter(c => c.mandatory === accessory.id);

    if (needy.length > 0) {
      return {
        result: false,
        reason: "This accessory is needed by " + needy
          .map(n => `${n.id}: ${n.name}`)
          .join(", ")
      };
    }
  } else {

    const currentAccessories = cc.accessories.length;

    let maxNumAcc;

    if (cc.model && cc.model[0]) {
      if (cc.model[0].model_id === 1) {
        maxNumAcc = 4;
      } else if (cc.model[0].model_id === 2 || cc.model[0].model_id === 5) {
        maxNumAcc = 5;
      } else if (cc.model[0].model_id === 3 || cc.model[0].model_id === 4) {
        maxNumAcc = 7;
      }
    }

    if (currentAccessories + 1 > maxNumAcc) {
      return {
        result: false,
        reason: "Adding this accessory would exceed the maximum number of accessories for your model type"
      };
    }

    // Addition
    // Check mandatory
    if (accessory.mandatory && !cc.accessories.some(acc => acc.accessory_id === accessory.mandatory)) {
      return {
        result: false,
        reason: `This accessory requires ${accessory.mandatory}: ${accessories.find(c => c.id === accessory.mandatory)?.name || "Unknown accessory"}`
      };
    }

    // Check incompatibilities
    let incompats = accessory.incompat.filter(i => cc.accessories.some(acc => acc.accessory_id === i));

    if (incompats.length > 0) {
      return {
        result: false,
        reason: "This accessory is incompatible with " + incompats
          .map(i => `${i}: ${accessories.find(c => c.id === i)?.name || "Unknown accessory"}`)
          .join(", ")
      };
    }

    // Check availability of accessories
    if (accessory.availability == 0) {
      return {
        result: false,
        reason: "This accessory has reached the maximum amount of usage"
      };
    }
  }

  // If everything else was ok, return successful
  return {
    result: true
  };
}

export {
  MyNavbar,
  NotFoundPage,
  modelsContext,
  accessoriesContext,
  usersContext,
  ccActivitiesContext,
  waitingContext,
  checkCarConfigurationConstraints,
  checkCarConfigurationModified,
  ErrorsAlert,
  SmallRoundButton
};