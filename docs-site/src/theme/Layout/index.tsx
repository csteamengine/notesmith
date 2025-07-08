import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import {type WrapperProps} from "@docusaurus/types";

export default function LayoutWrapper({ children }: WrapperProps<any>): JSX.Element {
    return (
        <>
            {children}
            <Analytics />
        </>
    );
}
