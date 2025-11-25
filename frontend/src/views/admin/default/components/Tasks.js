// Chakra imports
import {
  Box,
  Flex,
  Text,
  Icon,
  useColorModeValue,
  Checkbox,
  Spinner,
  Input,
  Button,
  useToast,
} from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card.js";
import React from "react";
import { useAuth } from "contexts/AuthContext";
import { MdDelete } from "react-icons/md";

export default function Tasks({ onTaskChange, ...rest }) {
  const { token } = useAuth(); 
  const [tasks, setTasks] = React.useState([]); 
  const [loading, setLoading] = React.useState(false);
  const [newTaskName, setNewTaskName] = React.useState("");
  const toast = useToast();

  // --- 1. CHARGEMENT DES TÂCHES (URL Relative) ---
  const fetchTasks = () => {
    if (!token) return;
    setLoading(true);
    
    // URL relative : le navigateur utilise automatiquement le domaine/port actuel
    // C'est la clé pour que ça marche dans Docker sans erreur CORS
    fetch("/api/tasks", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((response) => {
        if (!response.ok) throw new Error("Erreur chargement");
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setTasks(data);
        } else {
          setTasks([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur loading:", err);
        setTasks([]);
        setLoading(false);
      });
  };

  // --- 2. AJOUT (URL Relative) ---
  const handleAddTask = () => {
    if (newTaskName.trim() === "" || !token) return;
    
    fetch("/api/tasks", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ name: newTaskName }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Erreur ajout");
        return response.json();
      })
      .then(() => {
        setNewTaskName("");
        fetchTasks(); // Recharger la liste
        if (onTaskChange) onTaskChange();
        toast({ title: "Tâche ajoutée", status: "success", duration: 2000 });
      })
      .catch((err) => {
        console.error("Erreur ajout:", err);
        toast({ title: "Erreur", description: "Impossible d'ajouter la tâche", status: "error" });
      });
  };

  // --- 3. MISE À JOUR (Check/Uncheck) ---
  const handleToggleTask = (taskId) => {
    if (!token) return;
    
    // Optimisation optimiste : on change l'état localement tout de suite pour la fluidité
    const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, is_done: !t.is_done } : t
    );
    setTasks(updatedTasks);

    fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((response) => {
        if (!response.ok) {
            // Si erreur serveur, on revient en arrière
            fetchTasks();
            throw new Error("Erreur update");
        }
        return response.json();
      })
      .then(() => {
        if (onTaskChange) onTaskChange();
      })
      .catch(err => console.error(err));
  };

  // --- 4. SUPPRESSION ---
  const handleDeleteTask = (taskId) => {
    if (!token) return;
    
    // Optimisation optimiste
    setTasks(tasks.filter(t => t.id !== taskId));

    fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) {
            fetchTasks();
            throw new Error("Erreur delete");
        }
        if (onTaskChange) onTaskChange();
      })
      .catch(err => console.error(err));
  };

  React.useEffect(() => {
    if (token) fetchTasks();
  }, [token]);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "white");
  const brandColor = useColorModeValue("brand.500", "white");

  if (!token) return null; 

  return (
    <Card {...rest} direction='column' w='100%' px='0px' overflowX={{ sm: "scroll", lg: "hidden" }}>
      <Flex px='25px' justify='space-between' mb='20px' align='center'>
        <Text color={textColor} fontSize='22px' fontWeight='700' lineHeight='100%'>
          Checklist de Voyage
        </Text>
      </Flex>
      <Box px='25px'>
        <Flex mb='20px' gap='10px'>
          <Input
            placeholder='Ex: Préparer le passeport'
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleAddTask(); }}
          />
          <Button onClick={handleAddTask} colorScheme='brand'>Ajouter</Button>
        </Flex>

        {loading && tasks.length === 0 && (
          <Flex justify='center' align='center' h='100px'>
            <Spinner color={brandColor} />
          </Flex>
        )}
        {!loading && tasks.length === 0 && (
          <Text color={textColorSecondary} textAlign='center' mb='20px'>
            Aucune tâche pour le moment.
          </Text>
        )}

        {tasks.map((task) => (
          <Flex key={task.id} mb='20px' align='center'>
            <Checkbox 
              colorScheme='brandScheme' 
              me='16px' 
              isChecked={task.is_done}
              onChange={() => handleToggleTask(task.id)}
            />
            <Text
              fontWeight='bold'
              color={textColor}
              fontSize='md'
              textAlign='start'
              textDecoration={task.is_done ? "line-through" : "none"}
              opacity={task.is_done ? 0.6 : 1}
            >
              {task.name}
            </Text>
            <Icon
              ms='auto'
              as={MdDelete}
              color='red.400'
              w='20px'
              h='20px'
              cursor='pointer'
              onClick={() => handleDeleteTask(task.id)}
            />
          </Flex>
        ))}
      </Box>
    </Card>
  );
}