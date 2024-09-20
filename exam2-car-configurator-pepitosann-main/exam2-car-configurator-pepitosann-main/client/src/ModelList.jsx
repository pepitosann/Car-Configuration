import { useContext, useEffect } from 'react';
import { Accordion, Badge, Col, Container, Row } from 'react-bootstrap';
import { modelsContext, SmallRoundButton, ccActivitiesContext, usersContext } from './Miscellaneous';

/**
 * List of all the models.
 * Receives the list of all models from a Context
 */
function ModelList(props) {

  const models = useContext(modelsContext);
  const user = useContext(usersContext);

  // On user change, it sets the selectedModel to the model chosen by that user
  useEffect(() => {
    if (user && user.cc && user.cc.model && user.cc.model.length > 0) {
      props.setSelectedModel(user.cc.model.id)
    }
  }, [user]
  );

  return (
    <Accordion alwaysOpen>
      {
        models.map((m) => <ModelItem
          model={m}
          key={m.id}
          selectedModel={props.selectedModel}
          setSelectedModel={props.setSelectedModel}
        />)
      }
    </Accordion>
  );
}

/**
 * A single model in the ModelList
 *
 * @param props.model the Model object to render
 * @param selectedModel the state used to understand if and which model has been selected
 * @param setSelectedModel the function to modify the state selectedModel
 */
function ModelItem(props) {

  const user = useContext(usersContext);

  return (
    <Row>
      <Col>
        <Accordion.Item eventKey={props.model.id}>
          <Accordion.Header>
            <Container style={{ paddingLeft: '0.5rem' }}>
              <Row className="align-items-center">
                <Col md="auto">
                  <Badge bg="dark">
                    <tt>{props.model.id}</tt>
                  </Badge>
                </Col>
                <Col>
                  <Row className="align-items-center">
                    <Col>
                      {props.model.name}
                    </Col>
                    <Col md="auto" style={{ paddingLeft: '1rem' }}>
                      <Badge bg="light" text="dark">
                        {props.model.power} kW
                      </Badge>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Container>
          </Accordion.Header>
          <Accordion.Body>
            <ModelItemDetails model={props.model} />
          </Accordion.Body>
        </Accordion.Item>
      </Col>
      {
        user?.cc.model ?
          <Col md="auto" className="align-self-center" style={{ paddingLeft: '0px' }}>
            <ContextualButton model={props.model} selectedModel={props.selectedModel} setSelectedModel={props.setSelectedModel} />
          </Col>
          : null
      }
    </Row>
  );
}

/**
 * A ContextualButton component specified to provide the web application services
 * 
 * @param props.model model object of the model this button is associated with
 * @param props.selectedModel the state used to understand if and which model has been selected
 * @param props.setSelectedModel the function to modify the state selectedModel
 */
function ContextualButton(props) {
  const cca = useContext(ccActivitiesContext);

  // Set as true the disabled depending if you have selected a model and if this model is equal to the a model in the car configuration
  const disabled = props.selectedModel !== null && props.selectedModel !== props.model.id;

  let inner = <i className="bi bi-plus" />;
  let variant = disabled ? "failure" : "success";
  let onClick = !disabled ? () => {
    cca.addModelToCC(props.model.id);
    props.setSelectedModel(props.model.id)
  } : null;

  return (
    <SmallRoundButton inner={inner} variant={variant} onClick={onClick} disabled={disabled}/>
  );

}

/**
 * Details for the ModelItem.
 * This is shown when the corresponding model's row is clicked
 * 
 * @param props.model the model the details of which are to be rendered
 */
function ModelItemDetails(props) {

  return (
    <div>
      <strong>Price: </strong>
      <span>{props.model.price} (€)</span>
      <br />
      <strong> Number of possible accessories to add: </strong>
      <span>{props.model.maxNumber}</span>
    </div>
  );
}

export { ModelList };