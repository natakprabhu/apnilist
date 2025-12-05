import { Link } from "react-router-dom";
import "./NotFound.css"; // CRITICAL: This imports the animation

const NotFound = () => {
  return (
    <section className="page_404 min-h-screen flex items-center justify-center">
      <div className="container mx-auto">
        <div className="flex justify-center">
          <div className="w-full md:w-10/12 text-center">
            
            {/* This div has the CSS background image (the animation) */}
            <div className="four_zero_four_bg">
              <h1 className="text-center">404</h1>
            </div>

            <div className="contant_box_404">
              <h3 className="text-2xl font-bold mb-4">
                Look like you're lost
              </h3>

              <p className="text-lg mb-4">the page you are looking for not available!</p>

              <Link to="/" className="link_404">
                Go to Home
              </Link>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
