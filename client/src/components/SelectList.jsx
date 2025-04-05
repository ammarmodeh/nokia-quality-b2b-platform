import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

const SelectList = ({ lists, selected, setSelected, label }) => {
  return (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        label={label}
      >
        {lists.map((list, index) => (
          <MenuItem key={index} value={list}>
            {list}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SelectList;
