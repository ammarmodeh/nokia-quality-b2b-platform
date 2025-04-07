import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import api from "../api/api";
import { logout } from "../redux/slices/authSlice";
import Textbox from "../components/Textbox";
import Button from "../components/Button";
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { HashLoader } from "react-spinners";

const ChangePassword = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const newPassword = watch("newPassword", "");

  const submitHandler = async (data) => {
    setLoading(true);
    try {
      const response = await api.post("/users/change-password",
        { oldPassword: data.oldPassword, newPassword: data.newPassword },
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );

      if (response.data.message === "Password changed successfully") {
        setSnackbarMessage(response.data.message);
        setSnackbarSeverity("success");
        setOpenSnackbar(true);

        setTimeout(() => {
          dispatch(logout());
        }, 500);
      }
    } catch (error) {
      setSnackbarMessage(error.response?.data?.message || "An error occurred");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <div className="w-full max-w-md mx-auto mt-10 p-6 bg-[#25242478] rounded-lg shadow-md relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#25242478] bg-opacity-90 z-50">
          <HashLoader color="#1e3a8a" size={80} />
        </div>
      )}
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Change Password</h2>
      <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col gap-y-5">
        <Textbox
          // placeholder="Current Password"
          type="password"
          name="oldPassword"
          label="Current Password"
          className="w-full rounded-lg bg-dimgray text-white border-gray-400 focus:border-darkblue focus:ring-darkblue"
          register={register("oldPassword", { required: "Old Password is required!" })}
          error={errors.oldPassword ? errors.oldPassword.message : ""}
        />
        <Textbox
          // placeholder="New Password"
          type="password"
          name="newPassword"
          label="New Password"
          className="w-full rounded-lg bg-dimgray text-white border-gray-400 focus:border-darkblue focus:ring-darkblue"
          register={register("newPassword", { required: "New Password is required!" })}
          error={errors.newPassword ? errors.newPassword.message : ""}
        />
        <Textbox
          // placeholder="Confirm New Password"
          type="password"
          name="confirmPassword"
          label="Confirm New Password"
          className="w-full rounded-lg bg-dimgray text-white border-gray-400 focus:border-darkblue focus:ring-darkblue"
          register={register("confirmPassword", {
            required: "Confirm Password is required!",
            validate: (value) => value === newPassword || "Passwords do not match",
          })}
          error={errors.confirmPassword ? errors.confirmPassword.message : ""}
        />
        <Button
          type="submit"
          label={loading ? "Changing..." : "Change Password"}
          className="w-full h-10 bg-blue-900 text-white rounded-lg cursor-pointer hover:bg-blue-800 transition-colors"
          disabled={loading}
        />
      </form>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%', backgroundColor: snackbarSeverity === 'success' ? '#1e3a8a' : '#d32f2f', color: '#ffffff' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ChangePassword;