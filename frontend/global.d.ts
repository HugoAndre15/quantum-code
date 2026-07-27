// Declare CSS module imports so TypeScript doesn't error on side-effect CSS imports
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
