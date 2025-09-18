import React from 'react';

console.log('🚀 AppMinimal starting to render...');

function AppMinimal() {
  console.log('🎯 AppMinimal component rendering...');
  
  return (
    <div style={{ padding: '50px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#62EF83', textAlign: 'center' }}>
        🎉 TRACK FUTURA IS WORKING! 🎉
      </h1>
      <p style={{ textAlign: 'center', fontSize: '18px' }}>
        React is successfully mounting!
      </p>
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{ 
            padding: '15px 30px', 
            backgroundColor: '#62EF83',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          Go to Login (Test Navigation)
        </button>
      </div>
    </div>
  );
}

console.log('✅ AppMinimal component defined');

export default AppMinimal;