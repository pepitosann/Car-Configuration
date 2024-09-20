import { useState } from "react";
import { Button, Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import validator from "validator";

/**
 * The login page displayed on "/login"
 * 
 * @param props.loginCbk callback to perform the actual login
 * @param props.errorAlertActive true when the error alert on the top is active and showing, false otherwise
 */
function LoginForm(props) {

  const [username, setUsername] = useState("pepitosann");
  const [password, setPassword] = useState("fiorentina");

  const [usernameError, setUsernameError] = useState("");
  const [passwordValid, setPasswordValid] = useState(true);

  const [waiting, setWaiting] = useState(false);

  const handleSubmit = event => {
    event.preventDefault();

    const trimmedUsername = username.trim();
    const usernameError = validator.isEmpty(trimmedUsername) ? "Username must not be empty" : (
      !validator.isAscii(trimmedUsername) ? "Not a valid username" : ""
    );
    const passwordValid = !validator.isEmpty(password);

    if (!usernameError && passwordValid) {
      setWaiting(true);
      props.loginCbk(username, password, () => setWaiting(false));
    } else {
      setUsernameError(usernameError);
      setPasswordValid(passwordValid);
    }
  };

  return (
    <Container fluid style={{ marginTop: props.errorAlertActive ? "2rem" : "6rem" }}>
      <Row className="justify-content-center">
        <Col sm="auto">
          <Col style={{ maxWidth: "30rem", minWidth: "30rem", marginTop: "2rem" }}>
            <Card>
              <Card.Header as="h2">Login</Card.Header>
              <Container style={{ marginTop: "0.5rem", padding: "1rem" }}>
                <Form noValidate onSubmit={handleSubmit}>
                  <Row className="mb-3">
                    <Form.Group as={Col}>
                      <Form.Label>Username</Form.Label>
                      <Form.Control
                        isInvalid={!!usernameError}
                        type="text"
                        placeholder="Insert your username"
                        value={username}
                        autoFocus
                        onChange={(event) => {
                          setUsername(event.target.value);
                          setUsernameError("");
                        }}
                      />
                      <Form.Control.Feedback type="invalid">
                        {usernameError}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Row>
                  <Row className="mb-3">
                    <Form.Group as={Col}>
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        isInvalid={!passwordValid}
                        type="password"
                        placeholder="Insert your password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setPasswordValid(true);
                        }}
                      />
                      <Form.Control.Feedback type="invalid">
                        Password must not be empty
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Row>
                  <Row className="justify-content-start">
                    <Col md="auto">
                      <Button type="submit" disabled={waiting}>
                        {waiting ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                            />
                            {" "}
                          </>
                        ) : (
                          false
                        )}
                        Login
                      </Button>
                      <Link to="/" style={{ marginLeft: '10px' }}>
                        <Button type="button" className="btn btn-danger">
                          Back
                        </Button>
                      </Link>
                    </Col>
                  </Row>
                </Form>
              </Container>
            </Card>
          </Col>
          <Col md="3" />
        </Col>
      </Row>
    </Container>
  );

}

export { LoginForm };