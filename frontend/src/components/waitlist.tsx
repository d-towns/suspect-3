import { TextField, Text, Button, Flex, Box } from "@radix-ui/themes";
import React, { useEffect, useState } from "react";
import Helmet from "react-helmet";
import { useAuth } from "../context/auth.context";

const Waitlist: React.FC = () => {
    const [userEmail, setUserEmail] = useState('');
    const [signedUp, setSignedUp] = useState(false);
    const { user } = useAuth();


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



    const signUpForWaitlist = async () => {
        await fetch('https://api.getwaitlist.com/api/v1/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userEmail,
                waitlist_id: 23000
            }),


        }

        )
        setSignedUp(true);
    }

    return (
        <Box>
            {signedUp ? <Text size={'4'} as="p" align='center' weight={'bold'}>Thanks for signing up!</Text> :
                <Flex gap={'3'} direction={{initial:'column', lg:'row'}} align="center" justify="center">
                    <TextField.Root
                        placeholder="example@getwaitlist.com"
                        type="email"
                        required
                        value={userEmail}
                        className="w-full"
                        onChange={(e) => setUserEmail(e.target.value)}
                    />
                    <Button onClick={signUpForWaitlist}>Apply for Beta access</Button>
                </Flex>
            }
        </Box>
    )
}

const GetWaitlistWidget = () => {
    return (
        <>
            <div id="getWaitlistContainer" data-waitlist_id="23000" data-widget_type="WIDGET_2"></div>
            <Helmet >
                <link rel="stylesheet" type="text/css" href="https://prod-waitlist-widget.s3.us-east-2.amazonaws.com/getwaitlist.min.css" />
                <script src="https://prod-waitlist-widget.s3.us-east-2.amazonaws.com/getwaitlist.min.js"></script>
            </Helmet>
        </>
    )

}
export { Waitlist, GetWaitlistWidget };