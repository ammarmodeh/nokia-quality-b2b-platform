// import AssignedToMeTaskCard from "./AssignedToMeTaskCard";
import TaskCard from "./TaskCard";
// import { useSelector } from 'react-redux';

const BoardView = ({ tasks, users, }) => {
  // const currentUser = useSelector((state) => state?.auth?.user?._id);
  // console.log({ currentUser });


  return (
    <div className="flex flex-col">
      {/* Task display */}
      {
        tasks.length === 0 ? (
          <p className="text-center text-gray-500 mt-7">No tasks found.</p>
        ) : (
          <div className={"min-h-full w-full py-4 grid grid-cols-[repeat(auto-fit,_minmax(250px,_1fr))] gap-4 2xl:gap-10"}>
            {
              tasks && users && (
                tasks.map((task, index) => (
                  <TaskCard key={`task-${task._id}-${index}`} task={task} users={users} />
                  // <AssignedToMeTaskCard key={`task-${task._id}-${index}`} task={task} users={users} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} setUpdateSubtaskProgress={setUpdateSubtaskProgress} />
                ))
              )
            }
          </div>
        )
      }
    </div>
  );
};

export default BoardView;