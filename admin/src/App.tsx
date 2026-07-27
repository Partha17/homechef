import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Kitchens from "./pages/Kitchens";
import CreateKitchen from "./pages/CreateKitchen";
import SystemHealth from "./pages/SystemHealth";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/kitchens" element={<Kitchens />} />
      <Route path="/kitchens/create" element={<CreateKitchen />} />
      <Route path="/health" element={<SystemHealth />} />
    </Routes>
  );
}

export default App;