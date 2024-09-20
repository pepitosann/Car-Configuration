import { useContext } from 'react';
import { Accordion, Badge, Col, Container, Row } from 'react-bootstrap';
import { accessoriesContext, checkCarConfigurationConstraints, SmallRoundButton, ccActivitiesContext, usersContext, waitingContext } from './Miscellaneous';

/**
 * List of all the accessories.
 * Receives the list of all accessories from a Context
 */
function AccessoryList() {

  const accessories = useContext(accessoriesContext);

  return (
    <Accordion alwaysOpen>
      {
        accessories.map((c) => <AccessoryItem
          accessory={c}
          key={c.id}
        />)
      }
    </Accordion>
  );
}

/**
 * A single accessory in the AccessoryList
 *
 * @param props.accessory the Accessory object to render
 */
function AccessoryItem(props) {

  const accessories = useContext(accessoriesContext);
  const user = useContext(usersContext);

  const constraints = user?.cc.accessories && checkCarConfigurationConstraints(
    props.accessory,
    user.cc,
    accessories,
  );

  const constrOk = constraints !== undefined ? constraints.result : true;

  return (
    <Row>
      <Col>
        <Accordion.Item eventKey={props.accessory.id} className={(!constrOk ? " disabled" : "")}>
          <Accordion.Header>
            <Container style={{ "paddingLeft": "0.5rem" }}>
              <Row>
                <Col md="auto" className="align-self-center">
                  <Badge bg="dark">
                    <tt>{props.accessory.id}</tt>
                  </Badge>
                </Col>
                <Col md="auto">
                  {props.accessory.name}
                  {" "}
                </Col>
                <Col className="text-end align-self-center" style={{ "marginRight": "1rem" }}>
                  <Badge bg="light" text="dark">
                    {props.accessory.availability}
                    {" "}
                    <i className="bi bi-tools" />
                  </Badge>
                </Col>
              </Row>
            </Container>
          </Accordion.Header>
          <Accordion.Body><AccessoryItemDetails accessory={props.accessory} disabled={!constrOk} reason={constraints?.reason} /></Accordion.Body>
        </Accordion.Item>
      </Col>
      {
        (user?.cc.model && user.cc.model.length === 1) ?
          <Col md="auto" className="align-self-center" style={{ "paddingLeft": "0px" }}>
            <ContextualButton constraints={constraints} accessory={props.accessory} />
          </Col>
          : false
      }
    </Row>
  );
}

/**
 * A ContextualButton component specified to provide the web application services
 * 
 * @param props.constraints result of the call to "checkCarConfigurationConstraints"
 * @param props.accessory accessory object of the accessory this button is associated with
 */
function ContextualButton(props) {

  const user = useContext(usersContext);
  const cca = useContext(ccActivitiesContext);
  const waiting = useContext(waitingContext);

  let inner;
  let variant;
  let onClick;

  // Find out if this must be a add or a remove button.
  if (user.cc.accessories?.map(acc => acc.accessory_id).includes(props.accessory.id)) {
    inner = <i className="bi bi-dash" />;
    variant = "danger"
    onClick = () => cca.removeAccessoryFromCC(props.accessory.id);
  } else {
    inner = <i className="bi bi-plus" />;
    variant = "success";
    onClick = () => cca.addAccessoryToCC(props.accessory.id, props.accessory.name);
  }

  return <SmallRoundButton inner={inner} variant={variant} tooltip={props.constraints.reason || ""} disabled={!props.constraints.result || waiting} onClick={onClick} />;
}

/**
 * Details for the AccessoryItem.
 * This is shown when the corresponding accessory's row is clicked
 * 
 * @param props.accessory the accessory the details of which are to be rendered
 * @param props.disabled boolean, used when the accessory is incompatible with the current car configuration (other accessories selected)
 * @param props.reason reason why this accessory is disabled
 */
function AccessoryItemDetails(props) {

  const accessories = useContext(accessoriesContext);

  const mandatoryAccessory = accessories
    .find(a => a.id === props.accessory.mandatory) || { id: props.accessory.mandatory, name: "Unknown accessory" };

    const incompatibleList = props.accessory.incompat
    .map((i, index) => {
      const accessory = accessories.find(a => a.id === i) || { id: i, name: "Unknown accessory" };
      return <strong key={index} style={{ "color": "red" }}>{accessory.name}</strong>;
    })
    .flatMap((c, i, a) => [c, i < a.length - 1 ? ", " : false]);
    
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <div>
        <div>
          <strong>Description: </strong>
          <span>{props.accessory.description}</span>
          <br />
        </div>
        <div>
          <strong>Price: </strong>
          <span>{props.accessory.price} (€)</span>
          <br />
        </div>
        <strong>Mandatory: </strong>
        {
          props.accessory.mandatory ?
            <strong style={{ "color": "red" }}>{mandatoryAccessory.name}</strong>
            :
            <strong style={{ "color": "green" }}>
              None
              {" "}
              <i className="bi bi-check" />
            </strong>
        }
        <br />
        <strong>Incompatible: </strong>
        {
          incompatibleList.length !== 0 ? incompatibleList :
            <strong style={{ "color": "green" }}>
              None
              {" "}
              <i className="bi bi-check" />
            </strong>
        }
      </div>
    </div>
  );

}

export { AccessoryList };