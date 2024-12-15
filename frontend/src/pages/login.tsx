import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/auth.context';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';

import {
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  Link,
  Card,
  Tabs,
  Checkbox,
  Spinner,
} from '@radix-ui/themes';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [guestUsername, setGuestUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { login, loginWithGoogle, signup, guestSignIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      console.log('User:', user);
      navigate('/play');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);
    e.preventDefault();
    setError('');

    try {
      if (isSignup) {
        await signup(email, password, username);
        setSignupSuccess(true);
        setLoading(false);
      } else {
        await login(email, password);
        setLoading(false);
      }
    } catch (err) {
      setError(
        `An error occurred. Please try again. ${err instanceof Error ? err.message : ''
        }`
      );
      console.error('Auth error:', err);
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    setLoading(true);
    e.preventDefault();
    setError('');

    try {
      await guestSignIn(guestUsername);
      setLoading(false);
    } catch (err) {
      setError(
        `An error occurred. Please try again. ${err instanceof Error ? err.message : ''
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
      direction={{ initial: 'column', md: 'row' }}
      className='xxs:flex-col h-full w-full min-h-[600px]'
      align="center"
      justify="center"
      px="4"
      gap='9'
      mt={'6'}
    >
      <Card size="3" variant="surface" style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
        <Heading size="9" mb="4" style={{ fontFamily: "Special Elite"}}>
          Suspect
        </Heading>
        <Flex direction="column" gap="4" mt="4" style={{ margin: 'auto' }}>
          <Text size="6" weight="bold" style={{fontFamily:"Special Elite"}}>
            Deduction and Deception
          </Text>
          <Text size="3">
            Suspect is a online game where players use their deduction skills to solve a mystery. Players can choose to play as the detective or a suspect in a multiplayer setting.
          </Text>
          <Flex direction="row" gap="4" justify="center">
            <RouterLink to="/faq">
            <Card
              size="2"
              variant="surface"
              className="flex-1 text-center cursor-pointer transition-transform duration-300 hover:scale-105 border border-transparent hover:border-orange-500"
            >
              <Heading size="5">Single Player</Heading>
              <Text size="3">
                Play as the dectective and solve the mystery by gathering evidence and questioning AI suspects via real-time voice conversation.
              </Text>
            </Card>
            </RouterLink>
            <RouterLink to="/faq">
            <Card
              size="2"
              variant="surface"
              className="flex-1 text-center cursor-pointer transition-transform duration-300 hover:scale-105 border border-transparent hover:border-orange-500"
            >
              <Heading size="5">Multiplayer</Heading>
              <Text size="3">
                Enter the interrogation room as a suspect or the culprit. Use your wit to deceive the detective and other suspects to avoid getting framed...or caught!
              </Text>
            </Card>
            </RouterLink>
          </Flex>
          <Text size="6" weight={'medium'}>
            Join Suspect now and put your deductive skills to the test!
          </Text>
        </Flex>
      </Card>
      <Card size="3" variant="surface" style={{ width: '100%', padding: '60px', maxWidth: '600px' }}>
        <Tabs.Root defaultValue="account" className='w-full flex flex-col justify-center'>
          <Tabs.List className='mb-6 flex justify-center text-xl'>
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
            <Tabs.Trigger value="guest">Guest</Tabs.Trigger>
          </Tabs.List>

          <div style={{ minHeight: '300px', marginTop: '30px' }}>
            <Tabs.Content value="account" className='h-full '>
              <Heading size="6" align="center">
                {isSignup ? 'Create your account' : 'Sign in to your account'}
              </Heading>
              {error && (
                <Text color="red" mt="4">
                  {error}
                </Text>
              )}
              <form onSubmit={handleSubmit} className='my-3'>
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
                  {isSignup && (
                  <Text as="label" size="2">
                    <Flex gap="2">
                      <Checkbox checked={acceptedTerms} onCheckedChange={() => setAcceptedTerms(prev => !prev)} required />
                      Agree to <Link href='/terms'>Terms and Conditions</Link>
                    </Flex>
                  </Text> )}
                  <Button type="submit" mt="4">

                    { !loading && (isSignup ? 'Sign Up' : 'Sign In')}
                    {loading && <Spinner />}
                  </Button>

                </Flex>
              </form>
              <Flex justify={'between'}>
              <Text size="2" align="center" >
                <Link onClick={toggleSignup}>
                  {isSignup
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </Link>
              </Text>
              <Text size="2" align="center">
                <Link href="/forgot-password">Forgot password?</Link>
              </Text>
              </Flex>
              <Button size={'2'} className="w-full bg-white text-black mt-7"  onClick={() => loginWithGoogle() }>
                <Text align={'center'}> Sign in with google</Text>
              </Button>


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
                    <Text as="label" size="2">
                    <Flex gap="2">
                      <Checkbox checked={acceptedTerms} onCheckedChange={() => setAcceptedTerms(prev => !prev)} required />
                      Agree to<Link href='/terms' >Terms and Conditions</Link>
                    </Flex>
                  </Text>
                  <Button type="submit" mt="4">
                    { !loading && 'Continue as Guest'}
                    {loading && <Spinner />}
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