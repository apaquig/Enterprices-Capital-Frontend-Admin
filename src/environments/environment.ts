const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const environment = {
  production: false,
  apiUrl: isLocal ? 'http://localhost:5001/api/v1' : 'https://backend.enterprisescapitalservices.com/api/v1'
};

