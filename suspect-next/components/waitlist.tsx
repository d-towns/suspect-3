import { TextField, Text, Button, Flex, Box } from "@radix-ui/themes";
import { User } from "@supabase/supabase-js";
import React, { useEffect, useState } from "react";
import { signUpForWaitlist } from "@/app/actions";

export default function Waitlist(user: User) {
    const [userEmail, setUserEmail] = useState('');
    const [signedUp, setSignedUp] = useState(false);


    useEffect(() => {
        let interrupt = false;
        const fetchWaitlist = async () => {
            if (!user?.email) return;

            fetch(`https://api.getwaitlist.com/api/v1/signup?waitlist_id=23000&email=${user?.email}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then((response) => {
                if (interrupt) return
                response.json().then((data) => {
                    if (data.error_code) {
                        setSignedUp(false);
                    } else {
                        setSignedUp(true);
                    }
                })
            })
        }
        fetchWaitlist();

        return () => {
            interrupt = true;
        }

    }, [user])





    return (
        <Box>
            {signedUp ? <Text size={'4'} as="p" align='center' weight={'bold'}>Thanks for signing up!</Text> :
            <form action={signUpForWaitlist}>
                <Flex gap={'3'} direction={{initial:'column', lg:'row'}} align="center" justify="center">
                    <TextField.Root
                        placeholder="example@getwaitlist.com"
                        type="email"
                        required
                        value={userEmail}
                        className="w-full"
                        onChange={(e) => setUserEmail(e.target.value)}
                    />
                    <Button>Apply for Beta access</Button>
                </Flex>
                </form>
            }
        </Box>
    )
}

