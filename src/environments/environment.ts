export const environment = {
  production: false,
  apiUrl: 'http://localhost:8089/api',

  // Keycloak
  keycloak: {
    url: 'http://localhost:8180',
    realm: 'sageline',
    clientId: 'sageline-frontend'
  }
};