"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Globe } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Edit } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@to-do-list/backend/convex/_generated/api";
import type { Id } from "@to-do-list/backend/convex/_generated/dataModel";

import { useUser, useClerk, UserButton } from '@clerk/nextjs'

export default function TodosPage() {

	// states
	const [newTodoTitle, setNewTodoTitle] = useState("");
	const [newTodoDescription, setNewTodoDescription] = useState("");
	const [newTodoImage, setNewTodoImage] = useState<File | null>(null);
	const [updatingId, setUpdatingId] = useState<Id<"todos"> | null>(null);
	const [updatingTitle, setUpdatingTitle] = useState("");
	const [updatingDescription, setUpdatingDescription] = useState("");
	const [updatingImage, setUpdatingImage] = useState<File | null | undefined>(undefined);
	const [filterType, setFilterType] = useState<'all' | 'completed' | 'incomplete' | 'newest'>('newest');
	const [isUploading, setIsUploading] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [edgeDemoData, setEdgeDemoData] = useState<any>(null);
	const [isLoadingEdgeDemo, setIsLoadingEdgeDemo] = useState(false);
	const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
	const edgeDemoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { user, isLoaded } = useUser();
	const { signOut } = useClerk();

	// Auto-clear edge demo results after 5 seconds
	useEffect(() => {
		if (edgeDemoData) {
			// Clear any existing timer
			if (edgeDemoTimerRef.current) {
				clearTimeout(edgeDemoTimerRef.current);
			}

			// Set new timer to clear results after 5 seconds
			edgeDemoTimerRef.current = setTimeout(() => {
				setEdgeDemoData(null);
				edgeDemoTimerRef.current = null;
			}, 5000);
		}

		// Cleanup timer on unmount
		return () => {
			if (edgeDemoTimerRef.current) {
				clearTimeout(edgeDemoTimerRef.current);
			}
		};
	}, [edgeDemoData]);

	const filterLabels = {
		newest: 'Newest',
		all: 'All',
		incomplete: 'Pending',
		completed: 'Completed'
	};

	// all client backend calls
	const todos = useQuery(
		filterType === 'all' ? api.todos.getAll :
		filterType === 'completed' ? api.todos.getCompleted :
		filterType === 'incomplete' ? api.todos.getIncomplete :
		api.todos.getAllNewest,
		user ? { userId: user.id } : "skip"
	);
	const createTodoMutation = useMutation(api.todos.create);
	const updateTodoMutation = useMutation(api.todos.updateTodo);
	const toggleTodoMutation = useMutation(api.todos.toggle);
	const deleteTodoMutation = useMutation(api.todos.deleteTodo);
	const generateUploadUrl = useMutation(api.files.generateUploadUrl);
	const getStorageUrl = useMutation(api.files.getStorageUrl);

	// upload image using Convex storage
	const uploadImage = async (file: File): Promise<string | undefined> => {
		try {
			// Validate file type
			if (!file.type.startsWith('image/')) {
				throw new Error('File must be an image');
			}

			// Validate file size (5MB limit)
			if (file.size > 5 * 1024 * 1024) {
				throw new Error('File size must be less than 5MB');
			}

			// Generate upload URL
			const postUrl = await generateUploadUrl();

			// Upload file directly to the generated URL
			const result = await fetch(postUrl, {
				method: "POST",
				headers: {
					"Content-Type": file.type || "application/octet-stream",
				},
				body: file,
			});

			if (!result.ok) {
				throw new Error("Failed to upload file");
			}

			const { storageId } = await result.json();

			// Get the storage URL
			const fileUrl = await getStorageUrl({ storageId });

			if (!fileUrl) {
				throw new Error('Failed to generate file URL');
			}

			return fileUrl;
		} catch (error) {
			console.error('Upload error:', error);
			return undefined;
		}
	};

	// add a todo
	const handleAddTodo = async (e: React.FormEvent) => {
		e.preventDefault();

		const title = newTodoTitle.trim();
		const description = newTodoDescription.trim();

		if (!title || !user) return;

		setIsUploading(true);
		let imageUrl: string | undefined = undefined;

		// Upload image if selected
		if (newTodoImage) {
			imageUrl = await uploadImage(newTodoImage);
		}

		await createTodoMutation({
			title: title,
			description: description,
			userId: user.id,
			imageUrl: imageUrl ?? undefined
		});

		setNewTodoTitle("");
		setNewTodoDescription("");
		setNewTodoImage(null);
		setIsUploading(false);
	};

	// update todo
	const handleStartUpdate = (todo: any) => {
		setUpdatingId(todo._id);
		setUpdatingTitle(todo.title);
		setUpdatingDescription(todo.description);
		setUpdatingImage(undefined);
	};

	const handleSaveUpdate = async() => {
		if (!updatingTitle.trim()) return;

		setIsUpdating(true);
		let imageUrl: string | null | undefined = undefined;

		try {
			// Handle image changes
			if (updatingImage === null) {
				// User clicked "Remove" - set to null to remove image
				imageUrl = null;
			} else if (updatingImage) {
				// New image uploaded
				imageUrl = await uploadImage(updatingImage);
			}
			// If updatingImage is undefined, keep existing imageUrl (don't pass imageUrl to mutation)

			await updateTodoMutation({
				id: updatingId!,
				title: updatingTitle.trim(),
				description: updatingDescription.trim(),
				...(imageUrl !== undefined && { imageUrl }),
				userId: user!.id
			});
		} finally {
			setIsUpdating(false);
			setUpdatingId(null);
			setUpdatingTitle("");
			setUpdatingDescription("");
			setUpdatingImage(undefined);
		}
	};

	const handleCancelUpdate = () => {
		setUpdatingId(null);
		setUpdatingTitle("");
		setUpdatingDescription("");
		setUpdatingImage(undefined);
	}

	// toggle completed
	const handleToggleTodo = (id: Id<"todos">, currentCompleted: boolean) => {
		toggleTodoMutation({ 
			id, 
			isCompleted: !currentCompleted, 
			userId: user!.id
		});
	};

	// delete todo
	const handleDeleteTodo = (id: Id<"todos">) => {
		deleteTodoMutation({ 
			id,
			userId: user!.id 
		});
	};

	// display different 'no todo' messages based on the current filter
	const getNoDataMessage = () => {
		switch (filterType) {
			case 'completed':
				return 'No completed todos yet!';
			case 'incomplete':
				return 'No pending todos!';
			case 'newest':
			case 'all':
			default:
				return 'No todos yet. Add one above!';
		}
	}

	const handleLogout = () => {
		signOut({ redirectUrl: '/' });
	}

	// Test edge network demo
	const handleEdgeDemo = async () => {
		setIsLoadingEdgeDemo(true);
		try {
			const response = await fetch('/api/edge-demo');
			const data = await response.json();
			setEdgeDemoData(data);
		} catch (error) {
			console.error('Edge demo error:', error);
			setEdgeDemoData({ error: 'Failed to fetch edge demo data' });
		} finally {
			setIsLoadingEdgeDemo(false);
		}
	}

	if (!isLoaded) {
		return (
		  <div className="mx-auto w-full max-w-md py-10">
			<Card>
			  <CardContent className="flex justify-center py-4">
				<Loader2 className="h-6 w-6 animate-spin" />
			  </CardContent>
			</Card>
		  </div>
		)
	  }
	  
	  // Show sign-in if not authenticated
	  if (!user) {
		return (
		  <div className="mx-auto w-full max-w-md py-10">
			<Card>
			  <CardHeader>
				<CardTitle>Welcome!</CardTitle>
				<CardDescription>Please sign in to manage your todos</CardDescription>
			  </CardHeader>
			  <CardContent>
				<Button asChild>
				  <a href="/sign-in">Sign In</a>
				</Button>
			  </CardContent>
			</Card>
		  </div>
		)
	  }

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				{/* title */}
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>Todo List</span>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleEdgeDemo}
								disabled={isLoadingEdgeDemo}
								className="flex items-center gap-2"
							>
								{isLoadingEdgeDemo ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Globe className="h-4 w-4" />
								)}
								Test Edge Network
							</Button>
							<UserButton />
						</div>
					</CardTitle>
				</CardHeader>

				<CardContent>

					{/* form that takes in the task title and description */}
					<form
						onSubmit={handleAddTodo}
						className="mb-4 space-y-2"
					>
						{/* Add a new task */}
						<div className="flex flex-col">
							<label className="text-sm font-medium text-gray-300 mb-0.5">
								Add a new task
							</label>
							<Input
								value={newTodoTitle}
								onChange={(e) => setNewTodoTitle(e.target.value)}
								placeholder="Enter task title..."
								className="h-8"
							/>
						</div>

						{/* Add description */}
						<div className="flex flex-col">
							<label className="text-sm font-medium text-gray-300 mb-0.5">
								Add a description
							</label>
							<Input
								value={newTodoDescription}
								onChange={(e) => setNewTodoDescription(e.target.value)}
								placeholder="Enter task description..."
								className="h-8"
							/>
						</div>

						{/* Photo upload and Add button */}
						<div className="flex items-end gap-3">
							<div className="flex flex-col flex-1">
								<label className="text-sm font-medium text-gray-300 mb-1">
									Photo upload (Optional)
								</label>
								<div className="relative">
									<input
										type="file"
										accept="image/*"
										onChange={(e) => setNewTodoImage(e.target.files?.[0] || null)}
										className="absolute inset-0 w-full h-9 opacity-0 cursor-pointer z-10"
									/>
									<div className="flex items-center justify-center h-9 px-3 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
										<span className="text-sm text-gray-600 truncate max-w-full" title={newTodoImage ? newTodoImage.name : undefined}>
											{newTodoImage ? `Selected: ${newTodoImage.name.length > 20 ? `${newTodoImage.name.substring(0, 17)}...` : newTodoImage.name}` : 'Choose image file...'}
										</span>
									</div>
								</div>
							</div>
							<Button
								type="submit"
								disabled={!newTodoTitle.trim() || isUploading}
								className="h-9 px-6"
							>
								{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Task"}
							</Button>
						</div>
					</form>

					{/* Edge Demo Results */}
					{edgeDemoData && (
						<div className="mb-4 bg-gray-50 p-3 rounded-md text-sm font-mono">
							{edgeDemoData.error ? (
								<div className="text-red-600">{edgeDemoData.error}</div>
							) : (
								<div className="space-y-1 text-black">
									<div><strong>Edge Region:</strong> {edgeDemoData.edge?.region}</div>
									<div><strong>Processing Time:</strong> {edgeDemoData.performance?.processingTimeMs}ms</div>
									<div><strong>Your Location:</strong> {edgeDemoData.client?.city}, {edgeDemoData.client?.country}</div>
									<div><strong>Timestamp:</strong> {new Date(edgeDemoData.timestamp).toLocaleString()}</div>
								</div>
							)}
						</div>
					)}

					{/* dropdown for the filter */}
					<div className="mb-4">
						<DropdownMenu>
							{/* show default */}
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="justify-between">
									{filterLabels[filterType]}
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							{/* show menu (options) */}
							<DropdownMenuContent align="start" className="w-48">
								{/* newest */}
								<DropdownMenuItem
									onClick={() => setFilterType('newest')}
									className={filterType === 'newest' ? 'bg-accent' : ''}
								>
									Newest
								</DropdownMenuItem>

								{/* all */}
								<DropdownMenuItem
									onClick={() => setFilterType('all')}
									className={filterType === 'all' ? 'bg-accent' : ''}
								>
									All Todos
								</DropdownMenuItem>

								{/* pending */}
								<DropdownMenuItem
									onClick={() => setFilterType('incomplete')}
									className={filterType === 'incomplete' ? 'bg-accent' : ''}
								>
									Pending
								</DropdownMenuItem>

								{/* completed */}
								<DropdownMenuItem
									onClick={() => setFilterType('completed')}
									className={filterType === 'completed' ? 'bg-accent' : ''}
								>
									Completed
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
						
					{/* display the todos */}
					{todos === undefined ? (
						<div className="flex justify-center py-4">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					// if there's no todos, display this
					) : todos.length === 0 ? (
						<p className="py-4 text-center text-white">{getNoDataMessage()}</p>
					) : (
						// if there are todos, display this
						<ul className="space-y-2">
							{todos.map((todo) => (
								<li key ={todo._id} className={`flex items-center justify-between rounded-md border p-2 ${todo.isCompleted ? 'opacity-50' : ''}`}>
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
											{/* Current image display */}
											{todo.imageUrl && updatingImage === undefined && (
												<div className="mb-2">
													<div className="flex items-center gap-2 mb-1">
														<span className="text-sm text-gray-400">Current image:</span>
														<Button
															size="sm"
															variant="outline"
															onClick={() => setUpdatingImage(null)}
															className="text-xs px-2 py-1 h-6"
														>
															Remove
														</Button>
													</div>
													<img
														src={`/api/proxy-image?url=${encodeURIComponent(todo.imageUrl)}`}
														alt="Current task image"
														className="max-w-full h-20 object-cover rounded border"
													/>
												</div>
											)}
											{/* New image upload */}
											<div className="mb-2">
												<label className="text-sm text-gray-400 mb-1 block">
													{(todo.imageUrl && updatingImage === undefined) ? 'Replace image:' : 'Add image:'}
												</label>
												<input
													type="file"
													accept="image/*"
													onChange={(e) => setUpdatingImage(e.target.files?.[0] || null)}
													className="file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black h-8"
												/>
											</div>
											{/* show buttons */}
											<div className="flex gap-1">
												<Button size="sm" onClick={handleSaveUpdate} disabled={isUpdating}>
													{isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
												</Button>
												<Button size="sm" variant="outline" onClick={handleCancelUpdate} disabled={isUpdating}>Cancel</Button>
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
												<div className="flex-1">
													<label
														htmlFor={`todo-${todo._id}`}
														className={`${todo.isCompleted ? "line-through text-muted-foreground" : "cursor-pointer"}`}
														onClick={() => handleStartUpdate(todo)}
													>
														<span className={`font-bold ${todo.isCompleted ? 'text-gray-400' : 'text-white'}`}>{todo.title}</span>
														<br/>
														<span className={todo.isCompleted ? 'text-gray-400' : 'text-white'}>{todo.description}</span>
													</label>
													{/* Display image if exists */}
													{todo.imageUrl && (
														<div className="mt-2">
															<img
																src={`/api/proxy-image?url=${encodeURIComponent(todo.imageUrl)}`}
																alt={todo.title}
																className={`max-w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity ${todo.isCompleted ? 'opacity-50' : ''}`}
																loading="lazy"
																onClick={(e) => {
																	e.stopPropagation();
																	todo.imageUrl && setZoomedImageUrl(`/api/proxy-image?url=${encodeURIComponent(todo.imageUrl)}`);
																}}
															/>
														</div>
													)}
												</div>
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

			{/* Image Zoom Modal */}
			{zoomedImageUrl && (
				<div
					className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
					onClick={() => setZoomedImageUrl(null)}
				>
					<div className="relative max-w-4xl max-h-full">
						<img
							src={zoomedImageUrl}
							alt="Zoomed task image"
							className="max-w-full max-h-full object-contain rounded-lg"
							onClick={(e) => e.stopPropagation()}
						/>
						<button
							onClick={() => setZoomedImageUrl(null)}
							className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 transition-opacity"
						>
							×
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export const dynamic = 'force-dynamic';