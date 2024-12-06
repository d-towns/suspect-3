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
} from '@radix-ui/themes';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { login, signup, user } = useAuth();
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
        await signup(email, password, name);
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
    setName('');
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
      <Card size="3" variant="surface" style={{ width: '100%', maxWidth: '600px', height:'400px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-evenly' }}>
        <Heading size="6" align="center">
          {isSignup ? 'Create your account' : 'Sign in to your account'}
        </Heading>
        {error && (
          <Text color="red" mt="4">
            {error}
          </Text>
        )}
        <form onSubmit={handleSubmit} className='mt-6 w-full'>
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
                placeholder="Full name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <Button type="submit"  mt="4">
              {isSignup ? 'Sign Up' : 'Sign In'}
            </Button>
          </Flex>
        </form>
        <Text size="2" align="center" mt="4">
          <Link onClick={toggleSignup}>
            {isSignup
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Link>
        </Text>
      </Card>
    </Flex>
  );
};

export default Login;