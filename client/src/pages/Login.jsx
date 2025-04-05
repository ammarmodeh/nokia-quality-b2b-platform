import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Textbox from "../components/Textbox";
import Button from "../components/Button";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/api";
import { login } from "../redux/slices/authSlice";

const Login = () => {
  const { user } = useSelector((state) => state?.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const submitHandler = async (data) => {
    try {
      const response = await api.post("/users/login", {
        email: data.email,
        password: data.password,
      });

      const { accessToken, user } = response.data;

      // Store access token in localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userInfo", JSON.stringify(user));

      // Dispatch login action to Redux
      dispatch(login({ token: accessToken, user }));

      navigate("/dashboard"); // Redirect after successful login
    } catch (error) {
      console.error("Login failed:", error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="w-full h-screen flex items-center justify-center flex-col lg:flex-row bg-[#f3f4f6]">
      <div className="max-w-full flex gap-0 md:gap-30 flex-col md:flex-row items-center justify-center">
        {/* Left side branding */}
        <div className="h-full w-full lg:w-2/3 flex flex-col items-center justify-center">
          <div className="w-full md:max-w-lg 2xl:max-w-3xl flex flex-col items-center justify-center gap-5 md:gap-y-10 2xl:-mt-20">
            <span className="flex gap-1 py-1 px-3 border rounded-full text-sm md:text-base border-transparent text-gray-600">
              Manage all your tasks in one place!
            </span>
            <p className="flex flex-col gap-0 md:gap-4 text-4xl md:text-6xl 2xl:text-7xl font-black text-center text-blue-700">
              <span>Cloud-Based</span>
              <span>Task Manager</span>
            </p>
          </div>
        </div>

        {/* Right side login form */}
        <div className="w-full md:w-auto p-5 md:p-1 flex flex-col justify-center items-center">
          <form
            onSubmit={handleSubmit(submitHandler)}
            className="form-container w-full md:w-[400px] flex flex-col gap-y-8 bg-white px-10 pt-14 pb-14"
          >
            <div>
              <p className="text-blue-600 text-3xl font-bold text-center">
                Welcome back!
              </p>
              <p className="text-center text-base text-gray-700">
                Keep your credentials safe and secure.
              </p>
            </div>

            <div className="flex flex-col gap-y-5">
              <Textbox
                placeholder="email@example.com"
                type="email"
                name="email"
                label="Email Address"
                className="w-full rounded-full"
                register={register("email", { required: "Email Address is required!" })}
                error={errors.email ? errors.email.message : ""}
              />
              <Textbox
                placeholder="your password"
                type="password"
                name="password"
                label="Password"
                className="w-full rounded-full"
                register={register("password", { required: "Password is required!" })}
                error={errors.password ? errors.password.message : ""}
              />

              <span className="text-sm text-gray-500 hover:text-blue-600 hover:underline cursor-pointer">
                Forget Password?
              </span>

              <Button
                type="submit"
                label="Login"
                className="w-full h-10 bg-blue-700 text-white rounded-full pointer cursor-pointer"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
