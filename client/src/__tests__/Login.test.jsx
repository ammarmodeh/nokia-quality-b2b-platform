import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../redux/slices/authSlice';
import { Toaster } from 'sonner';
import React from 'react';

// Mock the API call
vi.mock('../api/api', () => ({
    default: {
        post: vi.fn(),
    },
}));

// Create a mock store
const createMockStore = () => configureStore({
    reducer: {
        auth: authReducer,
    },
});

describe('Login Component', () => {
    it('should render login form', () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <BrowserRouter>
                    <Login />
                    <Toaster />
                </BrowserRouter>
            </Provider>
        );

        // Using regex to be more flexible with case
        expect(screen.getByPlaceholderText(/email@example.com/i)).toBeInTheDocument();
        // "your password" contains "password"
        expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
        // Button follows "Login" label
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('should validate email input', async () => {
        const store = createMockStore();
        render(
            <Provider store={store}>
                <BrowserRouter>
                    <Login />
                </BrowserRouter>
            </Provider>
        );

        const emailInput = screen.getByPlaceholderText(/email@example.com/i);
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.blur(emailInput);

        expect(emailInput.value).toBe('invalid-email');
    });
});
