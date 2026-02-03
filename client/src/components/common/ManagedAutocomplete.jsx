import { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress
} from '@mui/material';
import api from '../../api/api';

const ManagedAutocomplete = ({
  category,
  value,
  onChange,
  label,
  multiple = false,
  freeSolo = false,
  required = false,
  sx,
  ...props
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!category) return;
      setLoading(true);
      try {
        // optimized: fetch only the needed category
        const response = await api.get(`/dropdown-options/category/${category}`);
        const data = response.data;

        if (Array.isArray(data)) {
           // Sort by order and extract values
           const sorted = data
             .sort((a, b) => (a.order || 0) - (b.order || 0))
             .map(opt => opt.value);
           setOptions(sorted);
        } else {
           setOptions([]);
        }
      } catch (error) {
        console.error(`Failed to fetch options for ${category}:`, error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [category]);

  return (
    <Autocomplete
      multiple={multiple}
      freeSolo={freeSolo}
      options={options}
      loading={loading}
      value={value}
      onChange={(event, newValue) => onChange(newValue)}
      onInputChange={(event, newInputValue, reason) => {
        if (freeSolo && reason === 'input') {
          onChange(newInputValue);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          fullWidth={props.fullWidth}
          sx={sx}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      {...props}
    />
  );
};

export default ManagedAutocomplete;
