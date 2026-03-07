import React, { createContext, useContext, useState } from "react";

interface ClientFilterContextType {
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
}

const ClientFilterContext = createContext<ClientFilterContextType>({
  selectedClientId: null,
  setSelectedClientId: () => {},
});

export const useClientFilter = () => useContext(ClientFilterContext);

export const ClientFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <ClientFilterContext.Provider value={{ selectedClientId, setSelectedClientId }}>
      {children}
    </ClientFilterContext.Provider>
  );
};
