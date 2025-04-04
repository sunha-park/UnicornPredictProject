import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Upload from "./components/Upload";
import Predict from "./components/Predict";

const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          {/* 기존 경로 */}
          <Route path="/upload" element={<Upload />} />
          {/* Predict 컴포넌트 라우팅 */}
          <Route path="/predict" element={<Predict />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
