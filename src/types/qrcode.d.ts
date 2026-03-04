declare module 'qrcode' {
  function toDataURL(text: string, options?: object): Promise<string>;
  export { toDataURL };
  export default { toDataURL };
}
