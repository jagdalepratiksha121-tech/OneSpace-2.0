declare module 'mammoth' {
  interface MammothResult {
    value: string;
    messages: {type: string; message: string}[];
  }

  const mammoth: {
    convertToHtml(input: {arrayBuffer: ArrayBuffer}): Promise<MammothResult>;
    extractRawText(input: {arrayBuffer: ArrayBuffer}): Promise<MammothResult>;
  };

  export default mammoth;
}
