import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

export const ProtectedRoute = ({ adminOnly = false, children }) => {
  // console.log('ProtectedRoute');
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'Admin') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // console.log('ProtectedRoute Passed the user:', user);

  return children;
};