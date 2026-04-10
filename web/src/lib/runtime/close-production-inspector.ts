type InspectorModule = {
  close: () => void;
  url: () => string | undefined;
};

type CloseProductionInspectorOptions = {
  inspector: InspectorModule;
};

export function closeProductionInspectorIfNeeded({ inspector }: CloseProductionInspectorOptions): void {
  if (!inspector.url()) {
    return;
  }

  inspector.close();
}
