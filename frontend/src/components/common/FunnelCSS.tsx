export const FunnelCSS = () => (
    <style>{`
        .funnel-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 60px;
        }
        
        .funnel-main {
            position: relative;
            display: inline-block;
        }
        
        .funnel-container {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            filter: drop-shadow(0 30px 50px rgba(0, 0, 0, 0.3));
        }
        
        /* Arrows */
        .funnel-arrows {
            display: flex;
            gap: 50px;
            justify-content: center;
            margin-bottom: -10px;
            position: relative;
            z-index: 100;
        }
        
        .funnel-arrow {
            width: 60px;
            height: 60px;
            position: relative;
        }
        
        .funnel-arrow::before {
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 38px;
            background: linear-gradient(180deg, #93C5FD 0%, #60A5FA 100%);
            border-radius: 4px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
        
        .funnel-arrow::after {
            content: '';
            position: absolute;
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 14px solid transparent;
            border-right: 14px solid transparent;
            border-top: 18px solid #60A5FA;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }
        
        .funnel-layer {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.3s ease, filter 0.3s ease;
        }
        
        .funnel-layer:hover {
            transform: scale(1.03);
            filter: brightness(1.1);
        }
        
        .funnel-layer svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        
        .funnel-text {
            position: relative;
            z-index: 100;
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 0.08em;
            color: white;
            text-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.5),
                0 0 10px rgba(0, 0, 0, 0.3),
                -1px -1px 2px rgba(255, 255, 255, 0.1);
            text-transform: uppercase;
        }
        
        /* Description Box */
        .funnel-descriptions {
            position: relative;
            width: 320px;
            height: 400px;
        }
        
        .funnel-description {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            background: white;
            border-radius: 16px;
            padding: 28px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            opacity: 0;
            transform: translateX(-20px);
            transition: opacity 0.4s ease, transform 0.4s ease;
            pointer-events: none;
            border: 2px solid #E5E7EB;
        }
        
        .funnel-description.active {
            opacity: 1;
            transform: translateX(0);
            pointer-events: auto;
        }
        
        .funnel-description h4 {
            font-size: 20px;
            font-weight: 800;
            color: #1E293B;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
        }
        
        .funnel-description p {
            font-size: 15px;
            line-height: 1.7;
            color: #64748B;
            margin: 0;
        }
        
        .funnel-description ul {
            margin-top: 16px;
            padding-left: 20px;
        }
        
        .funnel-description li {
            font-size: 14px;
            line-height: 1.8;
            color: #475569;
            margin-bottom: 8px;
        }
    `}</style>
);
