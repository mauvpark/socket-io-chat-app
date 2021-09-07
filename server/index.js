const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users.js");

const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

const PORT = process.env.PORT || 5000;

const router = require("./router");

app.use(cors());
app.use(router);

io.on("connection", (socket) => {
	socket.on("join", async ({ name, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, name, room });

		if (error) return callback(error);

		socket.emit("message", {
			user: "admin",
			text: `${user.name}, welcom to the room ${user.room}`,
		});
		socket.broadcast.to(user.room).emit("message", {
			user: "admin",
			text: `${user.name} has joined!`,
		});

		await socket.join(user.room);

		io.to(user.room).emit("roomData", {
			room: user.room,
			users: getUsersInRoom(user.room),
		});

		callback();
	});

	socket.on("sendMessage", (message, callback) => {
		const user = getUser(socket.id);

		io.to(user.room).emit("message", { user: user.name, text: message });
		io.to(user.room).emit("roomData", {
			user: user.name,
			users: getUsersInRoom(user.room),
		});

		callback();
	});

	socket.on("disconnect", () => {
		const user = removeUser(socket.id);

		if (user) {
			io.to(user.room).emit("message", {
				user: "admin",
				text: `${user.name} had left.`,
			});
		}
	});
});

server.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
