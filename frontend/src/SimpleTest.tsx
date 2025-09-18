import * as React from 'react';

export default function SimpleTest() {
  return (
    <div style={{
      padding: '50px',
      backgroundColor: '#62EF83',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '48px', color: '#000', margin: '0 0 20px 0' }}>
        ✅ TRACK FUTURA IS WORKING! ✅
      </h1>
      <p style={{ fontSize: '24px', color: '#333' }}>
        React is successfully rendering!
      </p>
    </div>
  );
}