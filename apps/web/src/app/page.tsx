"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Edit } from "lucide-react";
import { useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { api } from "@to-do-list/backend/convex/_generated/api";
import type { Id } from "@to-do-list/backend/convex/_generated/dataModel";

export default function TodosPage() {

	// states
	const [newTodoTitle, setNewTodoTitle] = useState("");
	const [newTodoDescription, setNewTodoDescription] = useState("");
	const [updatingId, setUpdatingId] = useState<Id<"todos"> | null>(null);
	const [updatingTitle, setUpdatingTitle] = useState("");
	const [updatingDescription, setUpdatingDescription] = useState("");

	// all client backend calls
	const todos = useQuery(api.todos.getAll);
	const createTodoMutation = useMutation(api.todos.create);
	const updateTodoMutation = useMutation(api.todos.updateTodo);
	const toggleTodoMutation = useMutation(api.todos.toggle);
	const deleteTodoMutation = useMutation(api.todos.deleteTodo);

	// add a todo
	const handleAddTodo = async (e: React.FormEvent) => {
		e.preventDefault();

		const title = newTodoTitle.trim();
		const description = newTodoDescription.trim();

		if (!title) return;

		await createTodoMutation({
			title: title,
			description: description	
		});

		setNewTodoTitle("");
		setNewTodoDescription("");
	};

	// update todo
	const handleStartUpdate = (todo: any) => {
		setUpdatingId(todo._id);
		setUpdatingTitle(todo.title);
		setUpdatingDescription(todo.description);
	};

	const handleSaveUpdate = async() => {
		if (!updatingTitle.trim()) return;

		await updateTodoMutation({
			id: updatingId!,
			title: updatingTitle.trim(),
			description: updatingDescription.trim(),
		});

		setUpdatingId(null);
		setUpdatingTitle("");
		setUpdatingDescription("");
	};

	const handleCancelUpdate = () => {
		setUpdatingId(null);
		setUpdatingTitle("");
		setUpdatingDescription("");
	}

	// toggle completed
	const handleToggleTodo = (id: Id<"todos">, currentCompleted: boolean) => {
		toggleTodoMutation({ id, isCompleted: !currentCompleted });
	};

	// delete todo
	const handleDeleteTodo = (id: Id<"todos">) => {
		deleteTodoMutation({ id });
	};

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				{/* title */}
				<CardHeader>
					<CardTitle>Todo List</CardTitle>
					<CardDescription>Manage your tasks efficiently</CardDescription>
				</CardHeader>

				<CardContent>
					{/* form that takes in the task title and description */}
					<form
						onSubmit={handleAddTodo}
						className="mb-6 flex items-center space-x-2"
					>
						<Input
							value={newTodoTitle}
							onChange={(e) => setNewTodoTitle(e.target.value)}
							placeholder="Add a new task..."
						/>
						<Input 
							value={newTodoDescription}
							onChange={(e) => setNewTodoDescription(e.target.value)}
							placeholder="Add description..."
						/>
						<Button type="submit" disabled={!newTodoTitle.trim()}>
							Add
						</Button>
					</form>

					{/* display the todos */}
					{todos === undefined ? (
						<div className="flex justify-center py-4">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					// if there's no todos, display this
					) : todos.length === 0 ? (
						<p className="py-4 text-center">No todos yet. Add one above!</p>
					) : (
						// if there are todos, display this
						<ul className="space-y-2">
							{todos.map((todo) => (
								<li key ={todo._id} className="flex items-center justify-between rounded-md border p-2">
									{/* check if this todo is being edited */}
									{updatingId === todo._id ? (
										// edit mode if yes
										<div className="flex-1 mr-2">
											{/* title */}
											<Input
												value={updatingTitle}
												onChange={(e) => setUpdatingTitle(e.target.value)}
												placeholder="Title..."
												className="mb-1"
											/>
											{/* description */}
											<Input 
												value={updatingDescription}
												onChange={(e) => setUpdatingDescription(e.target.value)}
												placeholder="Description..."
												className="mb-1"
											/>
											{/* show buttons */}
											<div className="flex gap-1">
												<Button size="sm" onClick={handleSaveUpdate}>Save</Button>
												<Button size="sm" variant="outline" onClick={handleCancelUpdate}>Cancel</Button>
											</div>
										</div>
									) : (
										// view mode if no
										<>
											<div className="flex items-center space-x-2 flex-1">
												{/* show checkbox */}
												<Checkbox 
													checked={todo.isCompleted}
													onCheckedChange={() => handleToggleTodo(todo._id, todo.isCompleted)}
													id={`todo-${todo._id}`}
												/>
												{/* show title and description */}
												<label
													htmlFor={`todo-${todo._id}`}
													className={`${todo.isCompleted ? "line-through text-muted-foreground" : ""} cursor-pointer`}
													onClick={() => handleStartUpdate(todo)}
												>
													<span className="font-bold">{todo.title}</span>
													<br/>
													<span className="text-gray-500">{todo.description}</span>
												</label>
											</div>

											<div className="flex gap-1">
												{/* show edit button */}
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleStartUpdate(todo)}
													aria-label="Edit todo"
												>
													<Edit className="h-4 w-4"/>
												</Button>

												{/* show delete button */}
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDeleteTodo(todo._id)}
													aria-label="Delete todo"
												>
													<Trash2 className="h-4 w-4"/>
												</Button>
											</div>
										</>
									)}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export const dynamic = 'force-dynamic';