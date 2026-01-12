import { useEffect, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import LoadingSpinner from '../common/LoadingSpinner';

const UserList = ({ setAssignedTo, assignedTo, users, loading, error, label, filteredUsers = [] }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  // console.log({ selectedUsers });

  // Handle selection updates
  const handleChange = (event, value) => {
    // console.log({ value });
    setSelectedUsers(value);
    setAssignedTo(value.map((user) => user._id)); // Store only user IDs
  };

  // Initialize selection when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      const preSelectedUsers = users.filter((user) => assignedTo.includes(user._id));
      // console.log({ preSelectedUsers });
      setSelectedUsers(preSelectedUsers);
    }
  }, [users, assignedTo]);

  if (loading) return <LoadingSpinner variant="inline" />;
  if (error) return <p className="text-red-500">Error loading users: {error}</p>;

  // Filter users based on the filteredUsers prop
  const filteredOptions = users.filter(user => !filteredUsers.includes(user._id));
  // console.log({ filteredOptions });

  return (
    <div>
      <p className="text-gray-300 mb-2">{label}</p>
      <Autocomplete
        multiple
        disableCloseOnSelect
        fullWidth
        options={filteredOptions}
        getOptionLabel={(user) => user.name}
        value={selectedUsers}
        onChange={handleChange}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder="Select Users"
            error={error}
            helperText={error ? "This field is required" : ""}
          />
        )}
      />
    </div>
  );
};

export default UserList;