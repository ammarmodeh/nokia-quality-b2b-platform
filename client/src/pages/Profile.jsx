import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/api";
import { logout, updateUser } from "../redux/slices/authSlice";
import Textbox from "../components/Textbox";
import Button from "../components/Button";
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { HashLoader } from "react-spinners";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      title: user?.title || "",
    },
  });

  useEffect(() => {
    if (user) {
      setValue("name", user.name);
      setValue("email", user.email);
      setValue("phoneNumber", user.phoneNumber);
      setValue("title", user.title);
    }
  }, [user, setValue]);

  const submitHandler = async (data) => {
    setLoading(true);
    try {
      const response = await api.put("/users/profile", data, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      const updatedUser = response.data;
      dispatch(updateUser(updatedUser));

      // Show success message briefly before logging out
      setOpenSnackbar(true);

      // Wait for 2 seconds to show the success message, then log out
      setTimeout(() => {
        setLoading(false);
        // Perform logout
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userInfo");
        dispatch(logout());
        navigate("/auth");
      }, 2000);

    } catch (error) {
      console.error("Profile update failed:", error.response?.data?.message || error.message);
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
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Edit Profile</h2>
      <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col gap-y-5">
        <Textbox
          placeholder="Your Name"
          type="text"
          name="name"
          label="Name"
          className="w-full rounded-lg bg-dimgray text-white border-gray-400 focus:border-darkblue focus:ring-darkblue"
          register={register("name", { required: "Name is required!" })}
          error={errors.name ? errors.name.message : ""}
        />
        <Textbox
          placeholder="email@example.com"
          type="email"
          name="email"
          label="Email Address"
          className="w-full rounded-lg bg-dimgray text-white border-gray-400 focus:border-darkblue focus:ring-darkblue"
          register={register("email", { required: "Email Address is required!" })}
          error={errors.email ? errors.email.message : ""}
        />
        <Textbox
          placeholder="Your Phone Number"
          type="text"
          name="phoneNumber"
          label="Phone Number"
          className="w-full rounded-lg bg-dimgray text-white border-gray-400 focus:border-darkblue focus:ring-darkblue"
          register={register("phoneNumber", { required: "Phone Number is required!" })}
          error={errors.phoneNumber ? errors.phoneNumber.message : ""}
        />
        <Textbox
          placeholder="Your Job Title"
          type="text"
          name="title"
          label="Job Title"
          className="w-full rounded-lg bg-dimgray text-white border-gray-400 focus:border-darkblue focus:ring-darkblue"
          register={register("title", { required: "Job Title is required!" })}
          error={errors.title ? errors.title.message : ""}
        />
        <Button
          type="submit"
          label={loading ? "Updating..." : "Update Profile"}
          className="w-full h-10 bg-blue-900 text-white rounded-lg cursor-pointer hover:bg-blue-800 transition-colors"
          disabled={loading}
        />
      </form>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          variant="filled"
          sx={{ width: '100%', backgroundColor: '#1e3a8a', color: '#ffffff' }}
        >
          Profile updated successfully!
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Profile;