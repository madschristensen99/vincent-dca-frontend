declare module '@mui/material' {
  export const Box: any;
  export const Container: any;
  export const Paper: any;
  export const TextField: any;
  export const Button: any;
  export const Typography: any;
  export const CircularProgress: any;
  export const FormControl: any;
  export const InputLabel: any;
  export const Select: any;
  export const MenuItem: any;
  export const Alert: any;
  export const Snackbar: any;
  export const Card: any;
  export const CardContent: any;
  export const CardActions: any;
  export const Grid: any;
  export const Divider: any;
}

declare module '@mui/material/styles' {
  export function createTheme(options: any): any;
  export function ThemeProvider(props: any): JSX.Element;
}

declare module 'react-router-dom' {
  export function useNavigate(): (path: string) => void;
  export function useLocation(): { search: string };
  export const Link: any;
}
