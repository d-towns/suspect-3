import React from "react";
import { Spinner } from "@radix-ui/themes";

const Loading : React.FC = () => {
    return (
        <div className="flex justify-center items-center h-screen">
            <h3 className="text-xl font-semibold">Loading...</h3>
            <Spinner className="ml-2" />
        </div>
    );
}

export default Loading;