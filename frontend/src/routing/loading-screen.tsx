const LoadingScreen = () => {
    return (
        <div className="flex justify-center items-center h-screen">
        <h3 className="text-xl font-semibold">
          Loading...
          <span className="inline-block ml-2 animate-spin">&#9696;</span>
        </h3>
      </div>
    )
}
export default LoadingScreen;