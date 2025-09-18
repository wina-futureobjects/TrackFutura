import React from 'react';

function AppTest() {
  console.log('AppTest component rendering...');
  
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#62EF83' }}>🎉 Track Futura - React is Working! 🎉</h1>
      <p style={{ fontSize: '18px', margin: '20px 0' }}>
        Authentication status: {localStorage.getItem('authToken') ? 'Authenticated' : 'Not authenticated'}
      </p>
      <div style={{ marginTop: '30px' }}>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{ 
            padding: '10px 20px', 
            margin: '10px',
            backgroundColor: '#62EF83',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Go to Login
        </button>
        <button 
          onClick={() => window.location.href = '/debug'}
          style={{ 
            padding: '10px 20px', 
            margin: '10px',
            backgroundColor: '#6EE5D9',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Go to Debug
        </button>
      </div>
      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <p>If you can see this message, React is working properly!</p>
        <p>Current time: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

export default AppTest;