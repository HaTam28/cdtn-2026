import React from 'react';

export const PersonIcon = ({ width = 20, height = 20 }) => (
    <svg viewBox="0 0 24 24" width={width} height={height}>
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z" />
    </svg>
);

export const LockIcon = ({ width = 20, height = 20 }) => (
    <svg viewBox="0 0 24 24" width={width} height={height}>
        <path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 7.73V17a1 1 0 0 0 2 0v-1.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 1 1 4 0v2Z" />
    </svg>
);

export const MailIcon = ({ width = 20, height = 20 }) => (
    <svg viewBox="0 0 24 24" width={width} height={height}>
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
);

export const OtpIcon = ({ width = 20, height = 20 }) => (
    <svg viewBox="0 0 24 24" width={width} height={height}>
        <path d="M10 17l-5-5 5-5" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 7l5 5-5 5" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default null;
