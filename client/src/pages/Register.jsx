import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Textbox from "../components/Textbox";
import Button from "../components/Button";
import api from "../api/api";

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const submitHandler = async (data) => {
    try {
      await api.post("/users/register", data, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      navigate("/auth"); // Redirect to login after successful registration
    } catch (error) {
      // console.error("Registration failed:", error.response?.data?.message || error.message);
    }
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#f3f4f6]">
      <div className="max-w-full flex flex-col md:flex-row items-center justify-center gap-5 md:gap-10">
        {/* Left side branding */}
        <div className="flex flex-col items-center justify-center md:w-1/2">
          <div className="flex flex-col items-center justify-center gap-5 md:gap-y-10">
            <span className="flex gap-1 py-1 px-3 border rounded-full text-sm md:text-base border-transparent text-gray-600">
              Manage all your tasks in one place!
            </span>
            <p className="flex flex-col gap-0 md:gap-4 text-4xl md:text-6xl font-black text-center text-blue-700">
              <span>Cloud-Based</span>
              <span>Task Manager</span>
            </p>
          </div>
        </div>

        {/* Right side registration form */}
        <div className="w-full md:w-1/2 p-5 flex justify-center items-center">
          <form
            onSubmit={handleSubmit(submitHandler)}
            className="form-container w-full max-w-md flex flex-col gap-y-6 bg-white p-8 rounded-lg shadow-md"
          >
            <div>
              <p className="text-blue-600 text-3xl font-bold text-center">
                Register
              </p>
              <p className="text-center text-base text-gray-700">
                Create your account.
              </p>
            </div>

            {step === 0 && (
              <div className="flex flex-col gap-y-4">
                <Textbox
                  placeholder="Your Name"
                  type="text"
                  name="name"
                  label="Name"
                  className="w-full rounded-md"
                  register={register("name", { required: "Name is required!" })}
                  error={errors.name ? errors.name.message : ""}
                />
                <Textbox
                  placeholder="email@example.com"
                  type="email"
                  name="email"
                  label="Email Address"
                  className="w-full rounded-md"
                  register={register("email", { required: "Email Address is required!" })}
                  error={errors.email ? errors.email.message : ""}
                />
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-y-4">
                <Textbox
                  placeholder="your password"
                  type="password"
                  name="password"
                  label="Password"
                  className="w-full rounded-md"
                  register={register("password", { required: "Password is required!" })}
                  error={errors.password ? errors.password.message : ""}
                />
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-y-4">
                <Textbox
                  placeholder="Your Phone Number"
                  type="text"
                  name="phoneNumber"
                  label="Phone Number"
                  className="w-full rounded-md"
                  register={register("phoneNumber", { required: "Phone Number is required!" })}
                  error={errors.phoneNumber ? errors.phoneNumber.message : ""}
                />
              </div>
            )}

            <div className="flex justify-between">
              {step > 0 && (
                <Button
                  type="button"
                  label="Back"
                  className="w-full md:w-auto h-10 bg-gray-300 text-gray-700 rounded-md cursor-pointer"
                  onClick={prevStep}
                />
              )}
              {step < 2 && (
                <Button
                  type="button"
                  label="Next"
                  className="w-full md:w-auto h-10 bg-blue-700 text-white rounded-md cursor-pointer"
                  onClick={nextStep}
                />
              )}
              {step === 2 && (
                <Button
                  type="submit"
                  label="Register"
                  className="w-full md:w-auto h-10 bg-blue-700 text-white rounded-md cursor-pointer"
                />
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
