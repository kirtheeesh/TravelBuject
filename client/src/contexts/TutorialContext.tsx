import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface TutorialContextType {
  tutorialEnabled: boolean;
  enableTutorial: () => void;
  disableTutorial: () => void;
  isLoading: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tutorialEnabled, setTutorialEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tutorialDisabled = localStorage.getItem("tutorial-disabled");
    setTutorialEnabled(!tutorialDisabled);
    setIsLoading(false);
  }, []);

  const enableTutorial = () => {
    localStorage.removeItem("tutorial-disabled");
    setTutorialEnabled(true);
  };

  const disableTutorial = () => {
    localStorage.setItem("tutorial-disabled", "true");
    setTutorialEnabled(false);
  };

  return (
    <TutorialContext.Provider value={{ tutorialEnabled, enableTutorial, disableTutorial, isLoading }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
}
