import { ClipLoader } from "react-spinners";

const LoadingSpinner = () => (
  <div className='text-center grid place-content-center'>
     <ClipLoader color="#252B36" size={35} />
  </div>
);

export default LoadingSpinner;