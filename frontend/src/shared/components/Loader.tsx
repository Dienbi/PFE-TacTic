import React from "react";
import "./Loader.css";

interface LoaderProps {
  fullScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ fullScreen = false }) => {
  const loaderContent = (
    <div className="leap-frog">
      <div className="leap-frog__dot"></div>
      <div className="leap-frog__dot"></div>
      <div className="leap-frog__dot"></div>
    </div>
  );

  if (fullScreen) {
    return <div className="loader-overlay">{loaderContent}</div>;
  }

  return loaderContent;
};

export default Loader;
