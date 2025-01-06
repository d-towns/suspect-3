import React, { useEffect } from "react";
import { Button, Card, Flex, Heading, Text, Theme } from "@radix-ui/themes";
import { useRouteError } from "react-router";
import { useTheme } from '../context/ThemeContext';
import { Link } from "react-router-dom";
import { errorService } from "../services/error.service";

const ErrorBoundary: React.FC= ( ) => {
    const error : any = useRouteError();

    const { theme } = useTheme();

    useEffect(() => {
        errorService.logError(error);
    }, [error]);


    return (
        
        <Theme accentColor="orange" grayColor="sand"  radius="large" scaling="95%" appearance={theme} >
            <Flex direction="column" align="center" justify="center" px="4" className="h-[80vh]">
        <Card size="3" variant="surface" style={{ padding: "20px", maxWidth: "600px" }} className="flex flex-col gap-5 justify-center items-center">
            <Heading size="5" mb="2">
                An error has occurred detective!
            </Heading>
            <Text>{error.message}</Text>
            <Link to={'/'}><Button > Go back to HQ </Button></Link>
        </Card>
    </Flex>
        </Theme>

    );
};

export default ErrorBoundary;