import React from 'react';

export const FunnelCSS = () => (
    <style>{`
        .funnel-container {
            perspective: 1000px;
        }
        .funnel-layer {
            position: relative;
            margin: 0 auto;
            border-radius: 50%;
            transform-style: preserve-3d;
            box-shadow: 0 20px 40px -10px rgba(37, 99, 235, 0.3);
        }
        .funnel-top {
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            width: 320px;
            height: 60px;
            z-index: 30;
            transform: rotateX(50deg);
            margin-bottom: -30px;
        }
        .funnel-middle {
            background: linear-gradient(135deg, #1E40AF 0%, #172554 100%);
            width: 240px;
            height: 50px;
            z-index: 20;
            transform: rotateX(50deg);
            margin-bottom: -25px;
        }
        .funnel-bottom {
            background: linear-gradient(135deg, #172554 0%, #0F172A 100%);
            width: 140px;
            height: 30px;
            z-index: 10;
            transform: rotateX(50deg);
        }
        .funnel-text {
            transform: rotateX(-20deg);
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        @keyframes float {
            0%, 100% { transform: translateY(0) rotateX(50deg); }
            50% { transform: translateY(-10px) rotateX(50deg); }
        }
        .float-anim { animation: float 4s ease-in-out infinite; }
    `}</style>
);
