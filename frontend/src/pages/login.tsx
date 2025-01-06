import React, { useState } from 'react';
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
  Separator,
  Spinner,
  Dialog
} from '@radix-ui/themes';
import { FcGoogle} from "react-icons/fc";
import { FaArrowLeft } from 'react-icons/fa';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onOpenChange }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  // useEffect(() => {
  //   if (user) {
  //     navigate('/play');
  //   }
  // }, [user, navigate]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, '');
      setSignupSuccess(true);
    } catch (err) {
      setError(`An error occurred. Please try again. ${err instanceof Error ? err.message : ''}`);
    }
    setLoading(false);
  };

  return (
    <Dialog.Root open={open}>
      <Dialog.Content onInteractOutside={() => onOpenChange && onOpenChange(false)}>
        <Dialog.Title className='flex items-center justify-center'>
        <Dialog.Close className='absolute top-7 left-10' onClick={() => onOpenChange && onOpenChange(false)}>
                <Button variant='outline'><FaArrowLeft/>Back</Button>
              </Dialog.Close>
              <Text size={'7'}>  Sign In</Text>
        </Dialog.Title>
        {signupSuccess ? (
          <Flex direction="column" align="center" justify="center" px="4" style={{ minHeight: '300px' }}>
            <Card size="3" variant="ghost" className='flex flex-col gap-5'>
              <Heading size="6" align="center">
                Check Your Email
              </Heading>
              <Text align="center" mt="2">
                A login link has been sent to your email.
              </Text>
              <Button onClick={() => setSignupSuccess(false)} mt="4">
                Back
              </Button>
            </Card>
          </Flex>
        ) : (
          <Flex justify="center" align="center" style={{ minHeight: '300px', width: '100%' }}>
            <Card
              size="3"
              variant="ghost"
              style={{ padding: '40px', maxWidth: '600px', width: '100%' }}
            >

              {error && (
                <Text color="red" mb="4">
                  {error}
                </Text>
              )}
              <Flex direction="column" gap="3">
                <form onSubmit={handleMagicLink}>
                  <TextField.Root
                    placeholder="Enter your email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button type="submit" mt="2" className='w-full'>
                    {!loading && 'Send Login Link'}
                    {loading && <Spinner />}
                  </Button>
                </form>
                <Separator orientation="horizontal" className="my-4" size={'4'} />
                <Button
                  size="2"
                  className="bg-white text-black"
                  onClick={() => loginWithGoogle()}
                >
                  <FcGoogle size={'24'} /> Sign In with Google
                </Button>
                <Text size="2" align="center" mt="6">
                  By signing up, you are agreeing to{' '}
                  <Link href="/terms">the Terms and Conditions</Link>.
                </Text>
              </Flex>
            </Card>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default LoginDialog;
