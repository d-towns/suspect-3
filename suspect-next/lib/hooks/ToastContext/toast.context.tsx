// frontend/src/components/ToastProvider.tsx
'use client';
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import './ToastProvider.css'; // Import your custom styles
import { Card } from '@radix-ui/themes';

interface ToastContextProps {
  addToast: (message: string, onClick?: () => void) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);



interface ToastItem {
  id: number;
  message: string;
  onClick?: () => void;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef(0);

  // Function to add a new toast to the queue
  const addToast = useCallback((message: string, onClick?: () => void) => {
    const id = toastIdRef.current + 1;
    toastIdRef.current = id;
    setToasts((prev) => [...prev, { id, message, onClick }]);
  }, []);

  // Effect to display the next toast when there's no current toast
  useEffect(() => {
    if (!currentToast && toasts.length > 0) {
      const nextToast = toasts[0];
      setCurrentToast(nextToast);
      setToasts((prev) => prev.slice(1));
    }
  }, [currentToast, toasts]);

  // Effect to handle the display duration of the current toast
  useEffect(() => {
    if (currentToast) {
      timerRef.current = setTimeout(() => {
        setCurrentToast(null);
      }, 5000); // Toast display duration
    }

    // Cleanup the timer when the toast is removed or component unmounts
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentToast]);

  // Function to handle manual closing of the toast
  const handleClose = useCallback(() => {
    setCurrentToast(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    console.log('closing toast');
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastPrimitive.Provider swipeDirection="left">
        {currentToast && (
          <Card asChild>
          <ToastPrimitive.Root
            className="
              grid grid-cols-[auto_max-content] items-center gap-x-[15px]
              rounded-md bg-white p-[15px]
              shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,
                      hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px]
              [grid-template-areas:_'title_action'_'description_action']
              data-[swipe=cancel]:translate-x-0
              data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
              data-[state=closed]:animate-hide
              data-[state=open]:animate-slideIn
              data-[swipe=end]:animate-swipeOut
              data-[swipe=cancel]:transition-[transform_200ms_ease-out]
            "
            open={Boolean(currentToast)}
            onOpenChange={(open) => {
              if (!open) {
                handleClose();
              }
            }}
          >
            
            <ToastPrimitive.Title className="mb-[5px] text-[15px] font-medium text-slate12 [grid-area:_title]">
              Notification
            </ToastPrimitive.Title>
            <ToastPrimitive.Description asChild>
              <div
                className="
                  m-0 text-[13px] leading-[1.3] text-slate11
                  [grid-area:_description] cursor-pointer
                "
                onClick={() => {
                  if (currentToast?.onClick) {
                    currentToast.onClick();
                  }
                  handleClose();
                }}
              >
                {currentToast.message}
              </div>
            </ToastPrimitive.Description>
            <ToastPrimitive.Action
              className="[grid-area:_action]"
              asChild
              altText="Close"
            >
              <button
                className="
                  inline-flex h-[25px] items-center justify-center
                  rounded px-2.5 text-xs font-medium leading-[25px]
                  shadow-[inset_0_0_0_1px] shadow-green7
                  hover:shadow-green8 focus:shadow-green8
                "
                onClick={handleClose}
              >
                <X size={20} />
              </button>
            </ToastPrimitive.Action>
          </ToastPrimitive.Root>
          </Card>
        )}
        <ToastPrimitive.Viewport
          className="
            fixed bottom-0 right-0 z-[2147483647] m-0
            flex w-[390px] max-w-[100vw] list-none flex-col
            gap-2.5 p-[25px] outline-none
          "
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};