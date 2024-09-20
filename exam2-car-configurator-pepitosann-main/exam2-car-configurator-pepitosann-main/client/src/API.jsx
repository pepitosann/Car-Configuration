const SERVER_HOST = "http://localhost";
const SERVER2_HOST = "http://localhost";
const SERVER_PORT = 3001;
const SERVER2_PORT = 3002;

const SERVER_BASE = `${SERVER_HOST}:${SERVER_PORT}/api/`;
const SERVER2_BASE = `${SERVER2_HOST}:${SERVER2_PORT}/api/`;

/**
 * Generic API call
 *
 * @param endpoint API endpoint string to fetch
 * @param method HTTP method
 * @param body HTTP request body string
 * @param headers additional HTTP headers to be passed to 'fetch'
 * @param expectResponse wheter to expect a non-empty response body
 * 
 * @returns whatever the specified API endpoint returns
 */
const APICall = async (endpoint, method = "GET", body = undefined, headers = undefined, expectResponse = true, server_base_url = SERVER_BASE) => {
  let errors = [];

  try {
    const response = await fetch(new URL(endpoint, server_base_url), {
      method,
      body,
      headers,
      credentials: "include"
    });

    if (response.ok) {
      if (expectResponse) return await response.json();
    }
    else errors = (await response.json()).errors;
  } catch {
    const err = ["Failed to contact the server"];
    throw err;
  }

  if (errors.length !== 0)
    throw errors;
};


/**
 * Fetches all the models from the server
 *
 * @returns list of models
 */
const fetchModels = async () => await APICall("models");

/**
 * Fetches all the accessories from the server
 *
 * @returns list of accessories
 */
const fetchAccessories = async () => await APICall("accessories");

/**
 * Fetches the number of available accessories for each accessory from the server
 *
 * @returns quantity of available accessories
 * Accessories that do not appear in this object have full availability
 */
const fetchAvailableAccessories = async () => await APICall("accessories?filter=available");

const deleteCarConfiguration = async () => await APICall(
  "car-configuration",
  "DELETE",
  undefined,
  undefined,
  false
);

const createCarConfiguration = async (cc) => await APICall(
  "car-configuration",
  "POST",
  JSON.stringify({ cc }),
  { "Content-Type": "application/json" },
  false
);

const editCarConfiguration = async (add, rem) => await APICall(
  "car-configuration-modifications",
  "POST",
  JSON.stringify({ add, rem }),
  { "Content-Type": "application/json" },
  false
);

/**
 * Attempts to login the user
 * 
 * @param username username of the user
 * @param password password of the user
 */
const login = async (username, password) => await APICall(
  "session",
  "POST",
  JSON.stringify({ username: username, password }),
  { "Content-Type": "application/json" }
);

/**
 * Logout.
 */
const logout = async () => await APICall(
  "session",
  "DELETE",
  undefined,
  undefined,
  false
);

/**
 * Fetches the currently logged in user's info
 */
const fetchCurrentUser = async () => await APICall("session/current");

/**
 * Fetches the token to access the second server
 */
const getAuthToken = async () => await APICall(
  "auth-token",
  "GET",
  undefined,
  undefined,
  true
);

/**
 * Post the manifacturing time for the car configuration
 */
const getManufacturingTime = async (authToken, savedCarConfiguration) => await APICall(
  "time",
  "post",
  JSON.stringify({ savedCarConfiguration }),
  {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${authToken}`,
  },
  true,
  SERVER2_BASE
)
const API = {
  fetchModels,
  fetchAccessories,
  fetchAvailableAccessories,
  deleteCarConfiguration,
  createCarConfiguration,
  editCarConfiguration,
  login,
  logout,
  getAuthToken,
  fetchCurrentUser,
  getManufacturingTime
};

export { API };