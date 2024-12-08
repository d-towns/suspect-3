import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/auth.context';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  Link,
  Card,
  Tabs,
} from '@radix-ui/themes';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [guestUsername, setGuestUsername] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { login, signup, guestSignIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignup) {
        await signup(email, password, username);
        setSignupSuccess(true);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(
        `An error occurred. Please try again. ${
          err instanceof Error ? err.message : ''
        }`
      );
      console.error('Auth error:', err);
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await guestSignIn(guestUsername);
    } catch (err) {
      setError(
        `An error occurred. Please try again. ${
          err instanceof Error ? err.message : ''
        }`
      );
      console.error('Guest auth error:', err);
    }
  };

  const toggleSignup = () => {
    setIsSignup(!isSignup);
    setError('');
    setSignupSuccess(false);
  };

  const resetForm = () => {
    setIsSignup(false);
    setSignupSuccess(false);
    setEmail('');
    setPassword('');
    setUsername('');
    setGuestUsername('');
  };

  if (signupSuccess) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        style={{ minHeight: '100vh' }}
        px="4"
      >
        <Card size="3" variant="ghost">
          <Heading size="6" align="center">
            Verification Email Sent
          </Heading>
          <Text align="center" mt="2">
            Please check your email and verify your account before signing in.
          </Text>
          <Button onClick={resetForm} mt="4">
            Back to Sign In
          </Button>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{ minHeight: '100vh', height: '100%' }}
      px="4"
    >
      <Card size="3" variant="surface" style={{ width: '100%', maxWidth: '600px' }}>
      <Tabs.Root defaultValue="account" className='w-full'>
        <Tabs.List className='mb-6'>
        <Tabs.Trigger value="account">Account</Tabs.Trigger>
        <Tabs.Trigger value="guest">Guest</Tabs.Trigger>
        </Tabs.List>

        <div style={{ minHeight: '300px' , marginTop: '30px'}}>
        <Tabs.Content value="account" className='h-full '>
          <Heading size="6" align="center">
          {isSignup ? 'Create your account' : 'Sign in to your account'}
          </Heading>
          {error && (
          <Text color="red" mt="4">
            {error}
          </Text>
          )}
          <form onSubmit={handleSubmit} className='my-6'>
          <Flex direction="column" gap="3">
            <TextField.Root
            placeholder="Email address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />
            <TextField.Root
            placeholder="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            />
            {isSignup && (
            <TextField.Root
              placeholder="Username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            )}
            <Button type="submit" mt="4">
            {isSignup ? 'Sign Up' : 'Sign In'}
            </Button>
          </Flex>
          </form>
          <Text size="2" align="center" mt="7">
          <Link onClick={toggleSignup}>
            {isSignup
            ? 'Already have an account? Sign In'
            : "Don't have an account? Sign Up"}
          </Link>
          </Text>
        </Tabs.Content>

        <Tabs.Content value="guest" className='h-full mt-6'>
          <Heading size="6" align="center">
          Continue as Guest
          </Heading>
          {error && (
          <Text color="red" mt="4">
            {error}
          </Text>
          )}
          <form onSubmit={handleGuestSubmit} className='mt-6'>
          <Flex direction="column" gap="3">
            <TextField.Root
            placeholder="Choose a username"
            type="text"
            required
            value={guestUsername}
            onChange={(e) => setGuestUsername(e.target.value)}
            />
            <Button type="submit" mt="4">
            Continue as Guest
            </Button>
          </Flex>
          </form>
        </Tabs.Content>
        </div>
      </Tabs.Root>
      </Card>
    </Flex>
  );
};

export default Login;