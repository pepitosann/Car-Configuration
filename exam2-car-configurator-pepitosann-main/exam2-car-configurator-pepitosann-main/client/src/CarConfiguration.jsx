import { useContext, useState } from "react";
import { Badge, Button, Col, ListGroup, OverlayTrigger, Popover, Row, Spinner, Tooltip } from "react-bootstrap";
import { checkCarConfigurationConstraints, modelsContext, accessoriesContext, ccActivitiesContext, usersContext, waitingContext } from './Miscellaneous';

/**
 * Component that shows the car configuration for the logged in user and allows them to edit it
 */
function CarConfiguration(props) {

  const models = useContext(modelsContext);
  const accessories = useContext(accessoriesContext);
  const user = useContext(usersContext);

  let carConfigurationModel = [];
  let carConfigurationAccessories = [];

  if (user.cc.model !== undefined && user.cc.accessories !== undefined) {
    // Get the Model in the car configuration
    carConfigurationModel = models.filter(m => user.cc.model.some(mm => mm.model_id === m.id));
    // Get the list of Accessories in the car configuration
    carConfigurationAccessories = accessories.filter(a => user.cc.accessories.some(aa => aa.accessory_id === a.id));
  }

  return (
    <>
      <Toolbar state={user.cc.model === undefined ? "create" : "edit"} edited={user.ccEdited} setSelectedModel={props.setSelectedModel} />
      {
        user.cc.model === undefined ?
          <>
            <Row className="justify-content-center" style={{ "color": "grey" }}>
              <Col md="auto" className="d-flex align-items-center justify-content-center" style={{ minHeight: '100px' }}>
                <div className="text-center">
                  <em>No car configuration saved</em>
                  <br />
                  <em>Click on "Create new Car Configuration"</em>
                </div>
              </Col>
            </Row>
          </>
          :
          <Row style={{ "marginLeft": "0px", "marginTop": "0.8rem" }}>
            <CarConfigurationList model={carConfigurationModel} accessories={carConfigurationAccessories} />
          </Row>
      }
    </>
  );
}

/**
 * A toolbar shown at the top of the CarConfiguration component with functional buttons
 * 
 * @param props.state specifies the state of this toolbar. Possible values: "create" - show Create button, "edit" - shows Save and Cancel buttons, together with the current price
 * @param props.edited when state="edit", this means that the car configuration has been edited, thus the Save button must be enabled
 * @param setSelectedModel the function to modify the state selectedModel
 */
function Toolbar(props) {
  
  /** Used to understand if a user has a car configuration or not */
  const [owner, setOwner] = useState(1);

  /** Used for the delete car configuration button to toggle its active state */
  const [deleteButtonActive, setDeleteButtonActive] = useState(false);

  /** Waiting for the save car configuration callback to resolve */
  const [saving, setSaving] = useState(false);

  /** Waiting for the delete car configuration callback to resolve */
  const [deleting, setDeleting] = useState(false);

  const models = useContext(modelsContext);
  const accessories = useContext(accessoriesContext);
  const user = useContext(usersContext);
  const cca = useContext(ccActivitiesContext);
  const waiting = useContext(waitingContext);

  /** Callback attached to the Save button */
  const saveCC = () => {
    setSaving(true);
    cca.saveCCChanges()
      .then(() => setSaving(false));
  };

  /** Callback attached to the Delete button */
  const deleteCC = () => {
    props.setSelectedModel(null);
    setDeleteButtonActive(false);
    setDeleting(true);
    cca.deleteCarConfiguration()
      .then(() => setDeleting(false));
  };

  let content;

  switch (props.state) {
    case "create":
      content = (
        <>
          <Col sm="auto" style={{ "padding": "0px" }}>
            <Button className="rounded-pill" onClick={() => cca.createCarConfiguration(owner)}>
              Create new Car Configuration
            </Button>
          </Col>
        </>);
      break;

    case "edit":
    default:
      const modelPrice = user.cc.model
        .map(sp => models.find(c => c.id === sp.model_id))
        .reduce((previous, current) => previous + (current?.price || 0), 0);

      const accessoriesPrice = user.cc.accessories
        .map(sp => accessories.find(c => c.id === sp.accessory_id))
        .reduce((previous, current) => previous + (current?.price || 0), 0);

      const totPrice = modelPrice + accessoriesPrice;

      content = (
        <>
          <Col className="mb-2">
            <Button variant="light" disabled className="rounded-pill" style={{ "height": "100%", "marginRight": "4px", "minWidth": "180px" }}>
              <span className="ms-4">Ready in {user.manufacturingTime ? Number.parseFloat(user.manufacturingTime) : '--'} days</span>
            </Button>
          </Col>
          <Col className="mb-2">
            <Button variant="light" disabled className="rounded-pill" style={{ "height": "100%", "marginRight": "4px", "minWidth": "100px" }}>
              <span>Total: {totPrice} €</span>
            </Button>
          </Col>
          <Col md="auto" style={{ "padding": "0px" }}>
            <Button variant="success" className="rounded-pill" disabled={!props.edited || waiting} style={{ "height": "100%", "marginRight": "4px", "minWidth": "100px" }} onClick={saveCC}>
              {
                saving ?
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                    <span className="visually-hidden">Saving...</span>
                  </>
                  : "Save"
              }
            </Button>
            <Button variant="danger" className="rounded-pill" disabled={!props.edited || waiting} style={{ "height": "100%", "marginRight": "15px", "minWidth": "100px" }} onClick={() => cca.discardCCChanges()}>
              Cancel
            </Button>
            <OverlayTrigger show={deleteButtonActive} placement="bottom" overlay={
              <Popover>
                <Popover.Header as="h3">Are you sure?</Popover.Header>
                <Popover.Body>
                  <Row className="mb-3" style={{ "paddingLeft": "10px", "paddingRight": "10px" }}>This action can not be undone.<br />Do you want to proceed anyway?</Row>
                  <Row style={{ "marginBottom": "0px" }}><Button variant="danger" disabled={waiting} onClick={deleteCC}>Yes, delete the car configuration</Button></Row>
                </Popover.Body>
              </Popover>
            }>
              <Button variant="outline-danger" className="rounded-pill" disabled={waiting} active={deleteButtonActive} onClick={() => setDeleteButtonActive(cur => !cur)} style={{ "height": "100%", "minWidth": "100px" }}>
                {
                  deleting ?
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />
                      <span className="visually-hidden">Deleting...</span>
                    </>
                    :
                    <>
                      <i className="bi bi-exclamation-circle" />
                      {" "}
                      Delete
                      {" "}
                      <i className="bi bi-exclamation-circle" />
                    </>
                }
              </Button>
            </OverlayTrigger>
          </Col>
        </>);
  }

  return ( <Row className="justify-content-end rounded-pill mb-1" > { content } </Row> );
}

/**
 * Displays the list of model and accessories in the car configuration
 * 
 * @param props.model the model in the car configuration
 * @param props.accessories the list of accessories in the car configuration
 */
function CarConfigurationList(props) {

  return (
    <ListGroup>
      { props.model.map(m => <ListGroup.Item key={m.id}><ModelListItem model={m} /></ListGroup.Item>) }
      { props.accessories.map(a => <ListGroup.Item key={a.id}><AccessoriesListItem accessory={a} /></ListGroup.Item>) }
    </ListGroup>
  );
}

/**
 * Single list item of accessories for the Car Configuration
 * 
 * @param props.accessories accessories object
 */
function AccessoriesListItem(props) {

  const accessories = useContext(accessoriesContext);
  const user = useContext(usersContext);
  const cca = useContext(ccActivitiesContext);
  const waiting = useContext(waitingContext);

  // Check if accessory can be removed
  const constraints = user?.cc.accessories && checkCarConfigurationConstraints(
    props.accessory,
    user.cc,
    accessories,
    user.quality
  );
  const constrOk = constraints !== undefined ? constraints.result : true;

  // The bin is red or not depending if you can delete an accessory or not
  const removeButton = <Button
    variant="link"
    disabled={!constrOk || waiting}
    style={{
      fontSize: '0.8rem',
      display: 'flex',
      alignItems: 'center',
      color: !constrOk || waiting ? 'gray' : 'red'
    }}
    onClick={() => cca.removeAccessoryFromCC(props.accessory.id)}
  >
    <i
      className="bi bi-trash"
      style={{
        fontSize: '1.2rem',
        marginRight: '0.3rem',
        color: !constrOk || waiting ? 'gray' : 'red'
      }}
    ></i>
  </Button>;

  return (
    <Row>
      <Col md="auto" className="align-self-center">
        <Badge bg="secondary">
          <tt>{props.accessory.id}</tt>
        </Badge>
      </Col>
      <Col className="align-self-center">
        {props.accessory.name}
        {" "}
      </Col>
      <Col md="auto" style={{ paddingLeft: '1rem' }}>
        <Badge bg="light" text="dark">
          Price: {props.accessory.price} €
        </Badge>
      </Col>
      <Col md="auto" className="align-self-center">
        {
          constrOk ?
            removeButton
            :
            <OverlayTrigger overlay={<Tooltip>{constraints.reason}</Tooltip>}>
              <div>{removeButton}</div>
            </OverlayTrigger>
        }
      </Col>
    </Row>
  );
}


/**
 * Single list item for the model of the CarConfiguration
 * 
 * @param props.model model object
 */
function ModelListItem(props) {
  
  return (
    <Row>
      <Col md="auto" className="align-self-center">
        <Badge bg="secondary">
          <tt>{props.model.id}</tt>
        </Badge>
      </Col>
      <Col className="align-self-center">
        <strong>{props.model.name}</strong>
        {" "}
      </Col>
      <Col md="auto" style={{ paddingLeft: '1rem' }}>
        <Badge bg="light" text="dark">
          Price: {props.model.price} €
        </Badge>
      </Col>
      <Col xs="auto"></Col>
    </Row>
  );
}

export { CarConfiguration };