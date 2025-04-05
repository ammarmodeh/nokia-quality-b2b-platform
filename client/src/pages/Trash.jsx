import { useEffect, useState, useMemo, useCallback } from 'react';
import { FaUndoAlt } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';
import api from '../api/api';
import { Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { MoonLoader } from 'react-spinners'; // Import MoonLoader

const Trash = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [trashes, setTrashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch trashes
  useEffect(() => {
    const fetchTrashes = async () => {
      try {
        const response = await api.get('/trash/get-all-trashes', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        const { data } = response;
        if (Array.isArray(data)) {
          setTrashes(data);
        } else {
          setError('Invalid data format received from the server.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrashes();
  }, []);

  // Restore task from trash
  const restoreTask = useCallback(async (taskId) => {
    const isConfirmed = confirm('Are you sure you want to restore this task?');
    if (!isConfirmed) return;

    try {
      const restoreResponse = await api.post(`/tasks/${taskId}/restore`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (restoreResponse.status === 200) {
        setTrashes((prevTrashes) => prevTrashes.filter((trash) => trash._id !== taskId));
        alert('Task restored successfully! Check the tasks page.');
      }
    } catch (error) {
      alert('Failed to restore task: ' + error.message);
    }
  }, []);

  // Delete task permanently
  const deleteTaskPermanently = useCallback(async (taskId) => {
    const isConfirmed = confirm('Are you sure you want to permanently delete this task?');
    if (!isConfirmed) return;

    try {
      await api.delete(`/trash/delete-permanently/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setTrashes((prevTrashes) => prevTrashes.filter((trash) => trash._id !== taskId));
      alert('Task deleted permanently!');
    } catch (error) {
      alert('Failed to permanently delete task: ' + error.message);
    }
  }, []);

  // Filter trashes to show only those created by the logged-in user
  const myTrashes = useMemo(() => {
    return trashes.filter((trash) => trash.createdBy === user._id);
  }, [trashes, user._id]);

  // Loading state with MoonLoader
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <MoonLoader color="#3ea6ff" size={50} /> {/* MoonLoader with blue color */}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  // No trashes found
  if (myTrashes.length === 0) {
    return (
      <div className="max-w-[1000px] mx-auto text-white">
        No trashes found for your account.
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#121212] min-h-screen max-w-[1000px] mx-auto">
      <h2 className="text-xl font-bold mb-4 text-white">Trash</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myTrashes.map((trash) => (
          <div
            key={trash._id}
            className="rounded-lg p-4 shadow-md bg-[#1e1e1e] text-white"
          >
            <h3 className="text-lg font-semibold">
              {trash.slid} - {trash.customerName}
            </h3>
            <p>
              <strong className="text-gray-400">Priority:</strong>{' '}
              <span className="text-white">{trash.priority}</span>
            </p>
            <p>
              <strong className="text-gray-400">Category:</strong>{' '}
              <span className="text-white">{trash.category}</span>
            </p>
            <p>
              <strong className="text-gray-400">Reason:</strong>{' '}
              <span className="text-white">{trash.reason}</span>
            </p>
            <p>
              <strong className="text-gray-400">Status:</strong>{' '}
              <span className="text-white">{trash.status}</span>
            </p>
            <p>
              <strong className="text-gray-400">Validation Status:</strong>{' '}
              <span className="text-white">{trash.validationStatus}</span>
            </p>
            <p>
              <strong className="text-gray-400">Responsibility:</strong>{' '}
              <span className="text-white">{trash.responsibility}</span>
            </p>
            <div className="flex align-center mt-2">
              <Button
                onClick={() => restoreTask(trash._id)}
                variant="text"
                title="Restore Task"
                sx={{ color: '#3ea6ff' }} // Blue color for the button
              >
                <FaUndoAlt size={20} className="w-full" />
              </Button>
              <Button
                onClick={() => deleteTaskPermanently(trash._id)}
                variant="text"
                title="Permanent Delete"
                sx={{ color: '#ff1744' }} // Red color for the button
              >
                <MdDelete size={24} className="w-full" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Trash;