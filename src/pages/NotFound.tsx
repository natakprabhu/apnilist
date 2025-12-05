import { Link } from "react-router-dom";
import "./NotFound.css"; // This imports the styles you just pasted

const NotFound = () => {
  return (
    // We wrap everything in a container to ensure it takes up the full screen
    <div className="not-found-container">
      
      {/* PASTE YOUR HTML BODY CONTENT HERE 
         
         1. Open your '404 Page Not Found/index.html'
         2. Copy everything inside the <body> tags (excluding <script> tags if any)
         3. Paste it here.
         
         IMPORTANT FIXES TO MAKE AFTER PASTING:
         - Change all 'class=' to 'className='
         - Change any <a href="/">Home</a> to <Link to="/">Home</Link>
         - Close all self-closing tags (e.g., <img ... /> or <br />)
      */}

      {/* Example of how it should look after you paste and fix: */}
      <div className="error-content">
         <h1>404</h1>
         <p>Oops! The page you are looking for does not exist.</p>
         <Link to="/" className="home-btn">
            Go Back Home
         </Link>
      </div>

    </div>
  );
};

export default NotFound;
