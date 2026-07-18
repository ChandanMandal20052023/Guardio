import axios from "axios";

export default axios.create({
    baseURL: "http://127.0.0.1:8000/api/",
    headers: {
        "Content-Type": "application/json",
    },
});

const handleSubmit = async () => {
  try {
    await axios.put(
      "/api/profile/",
      {
        full_name: FormData.fullName,
        phone: FormData.phone,
        location: FormData.location,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access")}`,
        },
      }
    );

    alert("Profile updated successfully");
  } catch (error) {
    console.error(error);
  }
};